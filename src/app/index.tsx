import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import SmsExtractorModule from '../../modules/sms-extractor/src/SmsExtractorModule';
import { initDatabase } from '../database/schema';
import { MpesaDbMessage, insertMessages, getStats, getMessages, getAllMessages } from '../database/queries';
import { parseMpesaMessage } from '../services/mpesaParser';
import { exportToCsv, exportToTxt } from '../services/exportService';

const ITEMS_PER_PAGE = 20;

export default function HomeScreen() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, received: 0 });
  
  const [messages, setMessages] = useState<MpesaDbMessage[]>([]);
  const [page, setPage] = useState(0);
  
  const [selectedMsg, setSelectedMsg] = useState<MpesaDbMessage | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        const database = await initDatabase();
        setDb(database);
        await loadData(database, 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, []);

  const loadData = async (database: SQLite.SQLiteDatabase, pageNum: number) => {
    const s = await getStats(database);
    setStats(s);
    
    const msgs = await getMessages(database, ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE);
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
          Alert.alert("Permission Denied", "SMS permission is required to extract messages.");
          setExtracting(false);
          return;
        }
      }

      // 1. Call native module
      const rawMessages = await SmsExtractorModule.getMpesaMessages();
      
      if (!rawMessages || rawMessages.length === 0) {
        Alert.alert("Info", "No MPESA messages found.");
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
      
      // 4. Reload UI
      await loadData(db, 0);
      Alert.alert("Success", "Messages extracted and saved successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "An error occurred during extraction.");
    } finally {
      setExtracting(false);
    }
  };

  const handleExportCsv = async () => {
    if (!db) return;
    const all = await getAllMessages(db);
    await exportToCsv(all);
  };

  const handleExportTxt = async () => {
    if (!db) return;
    const all = await getAllMessages(db);
    await exportToTxt(all);
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

        {/* Action Buttons */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          <TouchableOpacity 
            onPress={handleExtract} 
            disabled={extracting}
            className="flex-1 bg-dark py-3 px-4 rounded-lg items-center shadow-3xl"
          >
            {extracting ? (
               <ActivityIndicator size="small" color="#fff" />
            ) : (
               <Text className="text-white font-bold">Extract SMS</Text>
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
              disabled={messages.length < ITEMS_PER_PAGE} 
              onPress={() => db && loadData(db, page + 1)}
              className={`py-2 px-4 rounded ${messages.length < ITEMS_PER_PAGE ? 'bg-gray-200' : 'bg-primary'}`}
            >
              <Text className={messages.length < ITEMS_PER_PAGE ? 'text-gray-400' : 'text-white'}>Next</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}
