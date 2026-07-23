import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import SmsExtractorModule from '../../modules/sms-extractor/src/SmsExtractorModule';
import { initDatabase } from '../database/schema';
import { MpesaDbMessage, insertMessages, getStats, getMessages, getAllMessages } from '../database/queries';
import { parseMpesaMessage } from '../services/mpesaParser';
import { exportToCsv, exportToTxt } from '../services/exportService';
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

  const applyDatePreset = (preset: 'today' | '7days' | '30days' | 'month') => {
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

      // 1. Call native module
      const rawMessages = await SmsExtractorModule.getMpesaMessages(fromDate.getTime(), toDate.getTime());
      
      if (!rawMessages || rawMessages.length === 0) {
        showAlert("Info", "No MPESA messages found.", "info");
        setExtracting(false);
        return;
      }

      // 2. Parse and map
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

      // 3. Save to SQLite
      await insertMessages(db, parsedToInsert);
      
      // 4. Reload UI and save settings
      await loadData(db, 0);
      const now = new Date().toISOString();
      setLastExtract(now);
      await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ lastExtract: now }));
      
      showAlert("Success", "Messages extracted and saved successfully!", "success");
    } catch (e: any) {
      showAlert("Error", e.message || "An error occurred during extraction.", "error");
    } finally {
      setExtracting(false);
    }
  };

  const confirmExtract = () => {
    showConfirm(
      "Extract SMS",
      "Are you sure you want to extract messages? This may take a few moments.",
      () => handleExtract()
    );
  };

  const handleExportCsv = () => {
    if (!db) return;
    showConfirm(
      "Export CSV",
      "Are you sure you want to export all transactions to a CSV file?",
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
      "Are you sure you want to export all transactions to a TXT file?",
      async () => {
        const all = await getAllMessages(db);
        await exportToTxt(all);
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <Text className="text-3xl font-bold text-black dark:text-white mb-6">MPESA Dashboard</Text>
        
        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-primary p-4 rounded-xl shadow-3xl mb-4">
            <Text className="text-white/80 font-semibold mb-1">Total Messages</Text>
            <Text className="text-white text-2xl font-bold">{stats.total}</Text>
          </View>
          <View className="w-[48%] bg-danger p-4 rounded-xl shadow-3xl mb-4">
            <Text className="text-white/80 font-semibold mb-1">Total Sent</Text>
            <Text className="text-white text-2xl font-bold">{stats.sent}</Text>
          </View>
          <View className="w-[48%] bg-success p-4 rounded-xl shadow-3xl mb-4">
            <Text className="text-white/80 font-semibold mb-1">Total Received</Text>
            <Text className="text-white text-2xl font-bold">{stats.received}</Text>
          </View>
        </View>

        {/* Date Filters Card */}
        <View className="bg-white dark:bg-dark rounded-2xl p-4 shadow-3xl mb-6 border border-gray-100 dark:border-gray-800">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={18} color="#4361ee" />
              <Text className="text-base font-bold text-black dark:text-white">Date Filter Range</Text>
            </View>
            <TouchableOpacity 
              onPress={() => applyDatePreset('today')} 
              className="bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20"
            >
              <Text className="text-xs font-bold text-primary">Reset Today</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              <TouchableOpacity 
                onPress={() => applyDatePreset('today')}
                className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => applyDatePreset('7days')}
                className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => applyDatePreset('30days')}
                className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last 30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => applyDatePreset('month')}
                className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">This Month</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* From / To Input Cards */}
          <View className="flex-row items-center gap-2">
            {/* From Card */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowFromPicker(true)}
              className="flex-1 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Start Date</Text>
                <Text className="text-xs font-bold text-black dark:text-white" numberOfLines={1}>{formatDateLabel(fromDate)}</Text>
              </View>
              <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center ml-1">
                <Ionicons name="calendar-sharp" size={14} color="#4361ee" />
              </View>
            </TouchableOpacity>
            
            {/* Separator icon */}
            <Ionicons name="arrow-forward-outline" size={14} color="#9ca3af" />

            {/* To Card */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowToPicker(true)}
              className="flex-1 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">End Date</Text>
                <Text className="text-xs font-bold text-black dark:text-white" numberOfLines={1}>{formatDateLabel(toDate)}</Text>
              </View>
              <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center ml-1">
                <Ionicons name="calendar-sharp" size={14} color="#4361ee" />
              </View>
            </TouchableOpacity>
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

        {/* Action Buttons */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          <TouchableOpacity 
            onPress={confirmExtract} 
            disabled={extracting}
            className="flex-1 bg-dark py-3 px-4 rounded-lg items-center justify-center shadow-3xl"
          >
            {extracting ? (
               <ActivityIndicator size="small" color="#fff" />
            ) : (
               <View className="items-center">
                 <Text className="text-white font-bold">Extract SMS</Text>
                 {lastExtract && <Text className="text-gray-400 text-[10px] mt-1 text-center font-semibold">{new Date(lastExtract).toLocaleString()}</Text>}
               </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportCsv} className="bg-info py-3 px-4 rounded-lg shadow-3xl">
            <Text className="text-white font-bold">CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportTxt} className="bg-secondary py-3 px-4 rounded-lg shadow-3xl">
            <Text className="text-white font-bold">TXT</Text>
          </TouchableOpacity>
        </View>

        {/* Table */}
        <View className="bg-white dark:bg-dark rounded-xl overflow-hidden shadow-3xl p-4">
          <Text className="text-lg font-bold text-black dark:text-white mb-4">Recent Transactions</Text>
          
          <View className="flex-row border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
            <Text className="flex-1 font-bold text-gray-500 dark:text-gray-400">Name</Text>
            <Text className="w-20 font-bold text-gray-500 dark:text-gray-400 text-center">Amount</Text>
            <Text className="w-16 font-bold text-gray-500 dark:text-gray-400 text-center">Type</Text>
            <Text className="w-16 font-bold text-gray-500 dark:text-gray-400 text-right">Action</Text>
          </View>

          {messages.map((msg, idx) => (
            <View key={idx} className="flex-row border-b border-gray-100 dark:border-gray-800 py-3 items-center">
              <View className="flex-1">
                <Text className="text-black dark:text-white font-semibold" numberOfLines={1}>{msg.parsed_name}</Text>
                <Text className="text-xs text-gray-500">{msg.parsed_number}</Text>
                <Text className="text-xs text-info">{msg.source}</Text>
              </View>
              <Text className="w-20 text-center font-bold text-black dark:text-white">{msg.amount}</Text>
              <Text className={`w-16 text-center text-xs font-bold ${msg.transaction_type === 'Sent' ? 'text-danger' : 'text-success'}`}>
                {msg.transaction_type}
              </Text>
              <TouchableOpacity 
                className="w-16 items-end"
                onPress={() => {
                  setSelectedMsg(msg);
                  setModalVisible(true);
                }}
              >
                <Text className="text-primary font-bold">View</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {messages.length === 0 && (
            <Text className="text-center text-gray-500 py-8">No messages found.</Text>
          )}

          {/* Pagination */}
          <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <TouchableOpacity 
              disabled={page === 0} 
              onPress={() => db && loadData(db, page - 1)}
              className={`py-2 px-4 rounded ${page === 0 ? 'bg-gray-200' : 'bg-primary'}`}
            >
              <Text className={page === 0 ? 'text-gray-400' : 'text-white'}>Previous</Text>
            </TouchableOpacity>
            
            <Text className="text-gray-500 dark:text-gray-400">Page {page + 1}</Text>
            
            <TouchableOpacity 
              disabled={messages.length < itemsPerPage} 
              onPress={() => db && loadData(db, page + 1)}
              className={`py-2 px-4 rounded ${messages.length < itemsPerPage ? 'bg-gray-200' : 'bg-primary'}`}
            >
              <Text className={messages.length < itemsPerPage ? 'text-gray-400' : 'text-white'}>Next</Text>
            </TouchableOpacity>
          </View>

          {/* Per Page Selection */}
          <View className="flex-row justify-center items-center mt-4 gap-2">
            <Text className="text-gray-500 text-xs">Items per page:</Text>
            {[10, 20, 50, 100].map(val => (
              <TouchableOpacity 
                key={val}
                onPress={() => {
                  setItemsPerPage(val);
                  if (db) loadData(db, 0, val);
                }}
                className={`py-1 px-3 rounded ${itemsPerPage === val ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'}`}
              >
                <Text className={`text-xs ${itemsPerPage === val ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white dark:bg-dark rounded-2xl w-full p-6 shadow-3xl">
            <Text className="text-xl font-bold mb-4 text-black dark:text-white">Transaction Details</Text>
            
            {selectedMsg && (
              <View className="gap-2 mb-6">
                <Text className="text-gray-500">Name: <Text className="text-black dark:text-white font-semibold">{selectedMsg.parsed_name}</Text></Text>
                <Text className="text-gray-500">Number: <Text className="text-black dark:text-white font-semibold">{selectedMsg.parsed_number}</Text></Text>
                <Text className="text-gray-500">Amount: <Text className="text-black dark:text-white font-semibold">Ksh {selectedMsg.amount}</Text></Text>
                <Text className="text-gray-500">Type: <Text className="text-black dark:text-white font-semibold">{selectedMsg.transaction_type}</Text></Text>
                <Text className="text-gray-500">Source: <Text className="text-black dark:text-white font-semibold">{selectedMsg.source}</Text></Text>
                <Text className="text-gray-500">Date: <Text className="text-black dark:text-white font-semibold">{new Date(selectedMsg.date).toLocaleString()}</Text></Text>
                <Text className="text-gray-500 mt-2">Original Message:</Text>
                <Text className="text-black dark:text-white p-3 bg-gray-100 dark:bg-black rounded-lg mt-1">{selectedMsg.original_body}</Text>
              </View>
            )}

            <TouchableOpacity 
              className="bg-primary py-3 rounded-xl items-center shadow-3xl"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white font-bold text-lg">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Alert / Confirm Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlert.visible}
        onRequestClose={() => setCustomAlert(prev => ({...prev, visible: false}))}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white dark:bg-dark rounded-2xl w-full max-w-sm p-6 shadow-3xl">
            <Text className={`text-xl font-bold mb-2 ${
              customAlert.type === 'error' ? 'text-danger' : 
              customAlert.type === 'success' ? 'text-success' : 
              'text-black dark:text-white'
            }`}>
              {customAlert.title}
            </Text>
            
            <Text className="text-gray-600 dark:text-gray-300 mb-6 leading-5">
              {customAlert.message}
            </Text>
            
            <View className="flex-row justify-end gap-3 mt-2">
              {customAlert.type === 'confirm' && (
                <TouchableOpacity 
                  className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700"
                  onPress={() => setCustomAlert(prev => ({...prev, visible: false}))}
                >
                  <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                className={`py-2 px-6 rounded-lg ${
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
                <Text className="font-semibold text-white">
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
