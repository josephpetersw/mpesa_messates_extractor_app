import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import SmsExtractorModule from '../../modules/sms-extractor/src/SmsExtractorModule';
import { initDatabase } from '../database/schema';
import { MpesaDbMessage, insertMessages, getStats, getMessages, getAllMessages } from '../database/queries';
import { parseMpesaMessage } from '../services/mpesaParser';
import { exportToCsv, exportToTxt, exportToGoogleContactsCsv } from '../services/exportService';
import CustomDatePicker from '../components/CustomDatePicker';
import { Ionicons } from '@expo/vector-icons';

const SETTINGS_FILE = FileSystem.documentDirectory + 'settings.json';

type CustomAlertState = {
  visible: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'confirm';
  onConfirm?: () => void;
};

export default function HomeScreen() {
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, received: 0 });
  const [lastExtract, setLastExtract] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<CustomAlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });
  
  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomAlert({ visible: true, title, message, type: 'confirm', onConfirm });
  };
  
  const [messages, setMessages] = useState<MpesaDbMessage[]>([]);
  const [page, setPage] = useState(0);
  
  const [selectedMsg, setSelectedMsg] = useState<MpesaDbMessage | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const applyDatePreset = (preset: 'today' | '7days' | '30days' | 'month' | 'all') => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (preset === '7days') {
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (preset === '30days') {
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'all') {
      start.setTime(0);
    }

    setFromDate(start);
    setToDate(end);
  };

  useEffect(() => {
    async function setup() {
      try {
        const database = await initDatabase();
        setDb(database);
        await loadData(database, 0);
        
        const jsonInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (jsonInfo.exists) {
          const json = await FileSystem.readAsStringAsync(SETTINGS_FILE);
          const data = JSON.parse(json);
          if (data.lastExtract) setLastExtract(data.lastExtract);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, []);

  const loadData = async (database: SQLite.SQLiteDatabase, pageNum: number, perPage: number = itemsPerPage) => {
    const s = await getStats(database);
    setStats(s);
    
    const msgs = await getMessages(database, perPage, pageNum * perPage);
    setMessages(msgs);
    setPage(pageNum);
  };

  const handleExtract = async () => {
    if (!db) return;
    setExtracting(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        if (granted['android.permission.READ_SMS'] !== PermissionsAndroid.RESULTS.GRANTED) {
          showAlert("Permission Denied", "SMS permission is required to extract messages.", "error");
          setExtracting(false);
          return;
        }
      }

      const rawMessages = await SmsExtractorModule.getMpesaMessages(fromDate.getTime(), toDate.getTime());
      
      if (!rawMessages || rawMessages.length === 0) {
        showAlert("Info", "No MPESA messages found for this date range.", "info");
        setExtracting(false);
        return;
      }

      const parsedToInsert = rawMessages.map((msg: any) => {
        const parsed = parseMpesaMessage(msg.body);
        return {
          sms_id: msg.id,
          original_body: msg.body,
          parsed_name: parsed.parsed_name,
          parsed_number: parsed.parsed_number,
          transaction_type: parsed.transaction_type,
          amount: parsed.amount,
          date: msg.date,
          source: msg.source,
        };
      });

      await insertMessages(db, parsedToInsert);
      await loadData(db, 0);
      const now = new Date().toISOString();
      setLastExtract(now);
      await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ lastExtract: now }));
      
      showAlert("Success", `${rawMessages.length} messages processed successfully!`, "success");
    } catch (e: any) {
      showAlert("Error", e.message || "An error occurred during extraction.", "error");
    } finally {
      setExtracting(false);
    }
  };

  const confirmExtract = () => {
    showConfirm(
      "Extract SMS",
      "Extract MPESA messages for the selected date range?",
      () => handleExtract()
    );
  };

  const handleExportCsv = () => {
    if (!db) return;
    showConfirm(
      "Export CSV",
      "Export all transactions to a CSV file?",
      async () => {
        const all = await getAllMessages(db);
        await exportToCsv(all);
      }
    );
  };

  const handleExportTxt = () => {
    if (!db) return;
    showConfirm(
      "Export TXT",
      "Export all transactions to a TXT file?",
      async () => {
        const all = await getAllMessages(db);
        await exportToTxt(all);
      }
    );
  };

  const handleExportContacts = () => {
    if (!db) return;
    showConfirm(
      "Export Contacts",
      "Export unique contacts to a Google Contacts CSV file?",
      async () => {
        const all = await getAllMessages(db);
        await exportToGoogleContactsCsv(all);
      }
    );
  };


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-vristo-bg dark:bg-vristo-bg-dark">
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vristo-bg dark:bg-vristo-bg-dark">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-nunito-black text-black dark:text-white-light">MPESA Dashboard</Text>
          <Text className="text-sm font-nunito text-vristo-muted mt-0.5">Overview of your transactions</Text>
        </View>
        
        {/* Stats Grid — Vristo gradient card style */}
        <View className="flex-row flex-wrap justify-between mb-6">

          {/* Total Panel — Blue gradient */}
          <View className="w-[48%] rounded-md overflow-hidden mb-4 shadow-3xl"
            style={{ backgroundColor: undefined }}
          >
            <View className="p-4 bg-primary">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/80 font-nunito-semibold text-xs uppercase tracking-widest">Total</Text>
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="layers-outline" size={16} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
              <Text className="text-white text-3xl font-nunito-black">{stats.total}</Text>
              <Text className="text-white/60 text-xs font-nunito mt-1">Messages</Text>
            </View>
            <View className="h-1 bg-[#3a51c7]" />
          </View>

          {/* Sent Panel — Danger */}
          <View className="w-[48%] rounded-md overflow-hidden mb-4 shadow-3xl">
            <View className="p-4 bg-danger">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/80 font-nunito-semibold text-xs uppercase tracking-widest">Sent</Text>
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="arrow-up-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
              <Text className="text-white text-3xl font-nunito-black">{stats.sent}</Text>
              <Text className="text-white/60 text-xs font-nunito mt-1">Outgoing</Text>
            </View>
            <View className="h-1 bg-[#c9373f]" />
          </View>

          {/* Received Panel — Success */}
          <View className="w-[100%] rounded-md overflow-hidden mb-4 shadow-3xl">
            <View className="p-4 bg-success flex-row items-center justify-between">
              <View>
                <Text className="text-white/80 font-nunito-semibold text-xs uppercase tracking-widest mb-1">Received</Text>
                <Text className="text-white text-3xl font-nunito-black">{stats.received}</Text>
                <Text className="text-white/60 text-xs font-nunito mt-1">Incoming transactions</Text>
              </View>
              <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="arrow-down-circle-outline" size={28} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
            <View className="h-1 bg-[#008f48]" />
          </View>

        </View>

        {/* Date Filters — Vristo panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel mb-6 overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          {/* Panel header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark">
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#4361ee" />
              <Text className="text-sm font-nunito-bold text-black dark:text-white-light">Date Filter Range</Text>
            </View>
            <TouchableOpacity 
              onPress={() => applyDatePreset('today')} 
              className="bg-primary/10 px-3 py-1 rounded border border-primary/20"
            >
              <Text className="text-xs font-nunito-bold text-primary">Reset</Text>
            </TouchableOpacity>
          </View>

          <View className="px-5 py-4">
            {/* Quick Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {(['today', '7days', '30days', 'month', 'all'] as const).map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => applyDatePreset(preset)}
                    className="bg-[#f6f8fa] dark:bg-[#1a2941] py-1.5 px-3 rounded border border-vristo-border dark:border-vristo-border-dark"
                  >
                    <Text className="text-xs font-nunito-semibold text-dark dark:text-white-dark">
                      {preset === 'today' ? 'Today' : preset === '7days' ? 'Last 7 Days' : preset === '30days' ? 'Last 30 Days' : preset === 'month' ? 'This Month' : 'All Time'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* From / To Pickers */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setShowFromPicker(true)}
                className="flex-1 bg-[#f6f8fa] dark:bg-[#1a2941] px-3 py-2.5 rounded border border-vristo-border dark:border-vristo-border-dark flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-[10px] font-nunito-bold text-vristo-muted uppercase tracking-widest mb-0.5">Start Date</Text>
                  <Text className="text-xs font-nunito-bold text-black dark:text-white-light" numberOfLines={1}>
                    {fromDate.getTime() === 0 ? 'All Time' : formatDateLabel(fromDate)}
                  </Text>
                </View>
                <View className="w-7 h-7 rounded bg-primary/10 items-center justify-center ml-1">
                  <Ionicons name="calendar-sharp" size={13} color="#4361ee" />
                </View>
              </TouchableOpacity>

              <Ionicons name="arrow-forward-outline" size={14} color="#888ea8" />

              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setShowToPicker(true)}
                className="flex-1 bg-[#f6f8fa] dark:bg-[#1a2941] px-3 py-2.5 rounded border border-vristo-border dark:border-vristo-border-dark flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-[10px] font-nunito-bold text-vristo-muted uppercase tracking-widest mb-0.5">End Date</Text>
                  <Text className="text-xs font-nunito-bold text-black dark:text-white-light" numberOfLines={1}>
                    {formatDateLabel(toDate)}
                  </Text>
                </View>
                <View className="w-7 h-7 rounded bg-primary/10 items-center justify-center ml-1">
                  <Ionicons name="calendar-sharp" size={13} color="#4361ee" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showFromPicker && (
          <CustomDatePicker
            visible={showFromPicker}
            title="Select Start Date"
            currentDate={fromDate}
            onClose={() => setShowFromPicker(false)}
            onSelect={(selectedDate) => {
              setShowFromPicker(false);
              const newDate = new Date(selectedDate);
              newDate.setHours(0, 0, 0, 0);
              setFromDate(newDate);
            }}
          />
        )}
        
        {showToPicker && (
          <CustomDatePicker
            visible={showToPicker}
            title="Select End Date"
            currentDate={toDate}
            onClose={() => setShowToPicker(false)}
            onSelect={(selectedDate) => {
              setShowToPicker(false);
              const newDate = new Date(selectedDate);
              newDate.setHours(23, 59, 59, 999);
              setToDate(newDate);
            }}
          />
        )}

        {/* Action Buttons — Vristo btn pattern */}
        <View className="flex-col gap-2 mb-6">
          <TouchableOpacity 
            onPress={confirmExtract} 
            disabled={extracting}
            className="flex-row items-center justify-center gap-2 bg-black dark:bg-[#1b2e4b] py-3 px-4 rounded-md border border-black/50 dark:border-vristo-border-dark shadow-3xl"
          >
            {extracting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <View className="items-center">
                  <Text className="text-white font-nunito-bold text-sm">Extract SMS</Text>
                  {lastExtract && (
                    <Text className="text-white/50 text-[10px] font-nunito mt-0.5">
                      Last: {new Date(lastExtract).toLocaleString()}
                    </Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={handleExportCsv} 
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-info py-3 px-2 rounded-md shadow-3xl"
            >
              <Ionicons name="document-text-outline" size={15} color="#fff" />
              <Text className="text-white font-nunito-bold text-sm">CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleExportTxt} 
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-secondary py-3 px-2 rounded-md shadow-3xl"
            >
              <Ionicons name="code-outline" size={15} color="#fff" />
              <Text className="text-white font-nunito-bold text-sm">TXT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleExportContacts} 
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-warning py-3 px-2 rounded-md shadow-3xl"
            >
              <Ionicons name="people-outline" size={15} color="#fff" />
              <Text className="text-white font-nunito-bold text-sm">Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions Table — Vristo table style */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          {/* Table Header */}
          <View className="px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark flex-row items-center justify-between">
            <Text className="text-sm font-nunito-bold text-black dark:text-white-light">Recent Transactions</Text>
            <View className="bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
              <Text className="text-xs font-nunito-bold text-primary">{stats.total} total</Text>
            </View>
          </View>
          
          {/* Column Headers */}
          <View className="flex-row bg-vristo-table-head dark:bg-vristo-table-head-dark px-4 py-3 border-b border-vristo-border dark:border-vristo-border-dark">
            <Text className="flex-1 text-xs font-nunito-bold text-vristo-muted uppercase tracking-wider">Name</Text>
            <Text className="w-24 text-xs font-nunito-bold text-vristo-muted uppercase tracking-wider text-center">Amount</Text>
            <Text className="w-16 text-xs font-nunito-bold text-vristo-muted uppercase tracking-wider text-center">Type</Text>
            <Text className="w-12 text-xs font-nunito-bold text-vristo-muted uppercase tracking-wider text-right">View</Text>
          </View>

          {/* Rows */}
          {messages.map((msg, idx) => (
            <View key={idx} className="flex-row px-4 py-3 border-b border-vristo-border/40 dark:border-vristo-border-dark items-center">
              <View className="flex-1">
                <Text className="text-sm font-nunito-semibold text-black dark:text-white-light" numberOfLines={1}>
                  {msg.parsed_name || 'Unknown'}
                </Text>
                <Text className="text-xs font-nunito text-vristo-muted">{msg.parsed_number}</Text>
              </View>
              <Text className="w-24 text-center text-sm font-nunito-bold text-black dark:text-white-light">
                {msg.amount?.toLocaleString()}
              </Text>
              <View className="w-16 items-center">
                <View className={`px-2 py-0.5 rounded ${msg.transaction_type === 'Sent' ? 'bg-danger/10' : msg.transaction_type === 'Failed' ? 'bg-warning/10' : 'bg-success/10'}`}>
                  <Text className={`text-[10px] font-nunito-bold ${msg.transaction_type === 'Sent' ? 'text-danger' : msg.transaction_type === 'Failed' ? 'text-warning' : 'text-success'}`}>
                    {msg.transaction_type}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="w-12 items-end"
                onPress={() => {
                  setSelectedMsg(msg);
                  setModalVisible(true);
                }}
              >
                <Text className="text-primary font-nunito-bold text-xs">View</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {messages.length === 0 && (
            <View className="py-12 items-center">
              <Ionicons name="document-outline" size={36} color="#506690" />
              <Text className="text-center text-vristo-muted font-nunito mt-3">No messages found.</Text>
              <Text className="text-center text-vristo-muted font-nunito text-xs mt-1">Try extracting SMS first.</Text>
            </View>
          )}

          {/* Pagination */}
          <View className="flex-row justify-between items-center px-4 py-3 border-t border-vristo-border dark:border-vristo-border-dark">
            <TouchableOpacity 
              disabled={page === 0} 
              onPress={() => db && loadData(db, page - 1)}
              className={`py-2 px-4 rounded-md border ${page === 0 ? 'border-vristo-border dark:border-vristo-border-dark bg-transparent' : 'border-primary bg-primary'}`}
            >
              <Text className={`text-xs font-nunito-bold ${page === 0 ? 'text-vristo-muted' : 'text-white'}`}>Previous</Text>
            </TouchableOpacity>
            
            <Text className="text-vristo-muted font-nunito text-xs">Page {page + 1}</Text>
            
            <TouchableOpacity 
              disabled={messages.length < itemsPerPage} 
              onPress={() => db && loadData(db, page + 1)}
              className={`py-2 px-4 rounded-md border ${messages.length < itemsPerPage ? 'border-vristo-border dark:border-vristo-border-dark bg-transparent' : 'border-primary bg-primary'}`}
            >
              <Text className={`text-xs font-nunito-bold ${messages.length < itemsPerPage ? 'text-vristo-muted' : 'text-white'}`}>Next</Text>
            </TouchableOpacity>
          </View>

          {/* Per Page */}
          <View className="flex-row justify-center items-center pb-4 gap-2">
            <Text className="text-vristo-muted font-nunito text-xs">Rows per page:</Text>
            {[10, 20, 50, 100].map(val => (
              <TouchableOpacity 
                key={val}
                onPress={() => {
                  setItemsPerPage(val);
                  if (db) loadData(db, 0, val);
                }}
                className={`py-1 px-3 rounded border ${itemsPerPage === val ? 'border-primary bg-primary' : 'border-vristo-border dark:border-vristo-border-dark bg-transparent'}`}
              >
                <Text className={`text-xs font-nunito-bold ${itemsPerPage === val ? 'text-white' : 'text-vristo-muted'}`}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Detail Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-t-2xl p-6 shadow-3xl">
            <View className="flex-row items-center justify-between mb-5 pb-4 border-b border-vristo-border dark:border-vristo-border-dark">
              <Text className="text-lg font-nunito-black text-black dark:text-white-light">Transaction Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#506690" />
              </TouchableOpacity>
            </View>
            
            {selectedMsg && (
              <View className="gap-3 mb-6">
                {[
                  { label: 'Name', value: selectedMsg.parsed_name },
                  { label: 'Number', value: selectedMsg.parsed_number },
                  { label: 'Amount', value: `Ksh ${selectedMsg.amount}` },
                  { label: 'Type', value: selectedMsg.transaction_type },
                  { label: 'Source', value: selectedMsg.source },
                  { label: 'Date', value: new Date(selectedMsg.date).toLocaleString() },
                ].map(({ label, value }) => (
                  <View key={label} className="flex-row items-center">
                    <Text className="text-vristo-muted font-nunito-semibold text-sm w-20">{label}:</Text>
                    <Text className="text-black dark:text-white-light font-nunito-bold text-sm flex-1">{value}</Text>
                  </View>
                ))}
                <View className="mt-2">
                  <Text className="text-vristo-muted font-nunito-semibold text-sm mb-1">Original Message:</Text>
                  <Text className="text-black dark:text-white-light font-nunito p-3 bg-[#f6f8fa] dark:bg-[#1a2941] rounded-md text-xs leading-5">
                    {selectedMsg.original_body}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              className="bg-primary py-3 rounded-md items-center"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white font-nunito-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Alert/Confirm Modal */}
      <Modal animationType="fade" transparent={true} visible={customAlert.visible} onRequestClose={() => setCustomAlert(prev => ({...prev, visible: false}))}>
        <View className="flex-1 justify-center items-center bg-black/60 p-5">
          <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md w-full max-w-sm p-6 shadow-3xl border border-vristo-border dark:border-vristo-border-dark">
            {/* Icon */}
            <View className={`w-14 h-14 rounded-full items-center justify-center self-center mb-4 ${
              customAlert.type === 'error' ? 'bg-danger/10' :
              customAlert.type === 'success' ? 'bg-success/10' :
              customAlert.type === 'confirm' ? 'bg-primary/10' : 'bg-info/10'
            }`}>
              <Ionicons
                name={customAlert.type === 'error' ? 'alert-circle-outline' : customAlert.type === 'success' ? 'checkmark-circle-outline' : customAlert.type === 'confirm' ? 'help-circle-outline' : 'information-circle-outline'}
                size={30}
                color={customAlert.type === 'error' ? '#e7515a' : customAlert.type === 'success' ? '#00ab55' : '#4361ee'}
              />
            </View>

            <Text className={`text-lg font-nunito-black text-center mb-2 ${
              customAlert.type === 'error' ? 'text-danger' :
              customAlert.type === 'success' ? 'text-success' :
              'text-black dark:text-white-light'
            }`}>
              {customAlert.title}
            </Text>
            
            <Text className="text-vristo-muted font-nunito text-center text-sm mb-6 leading-5">
              {customAlert.message}
            </Text>
            
            <View className="flex-row gap-3">
              {customAlert.type === 'confirm' && (
                <TouchableOpacity 
                  className="flex-1 py-2.5 rounded-md border border-vristo-border dark:border-vristo-border-dark items-center"
                  onPress={() => setCustomAlert(prev => ({...prev, visible: false}))}
                >
                  <Text className="font-nunito-bold text-vristo-muted text-sm">Cancel</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                className={`flex-1 py-2.5 rounded-md items-center ${
                  customAlert.type === 'error' ? 'bg-danger' :
                  customAlert.type === 'success' ? 'bg-success' :
                  'bg-primary'
                }`}
                onPress={() => {
                  setCustomAlert(prev => ({...prev, visible: false}));
                  if (customAlert.onConfirm) {
                    customAlert.onConfirm();
                  }
                }}
              >
                <Text className="font-nunito-bold text-white text-sm">
                  {customAlert.type === 'confirm' ? 'Confirm' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
