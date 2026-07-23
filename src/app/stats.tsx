import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../database/schema';
import { getAdvancedStats } from '../database/queries';
import CustomDatePicker from '../components/CustomDatePicker';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    sent: 0,
    sentAmount: 0,
    received: 0,
    receivedAmount: 0,
  });

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of month
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

  useEffect(() => {
    async function setup() {
      try {
        const database = await initDatabase();
        setDb(database);
        await loadStats(database, fromDate.getTime(), toDate.getTime());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (db) {
      loadStats(db, fromDate.getTime(), toDate.getTime());
    }
  }, [fromDate, toDate, db]);

  const loadStats = async (database: SQLite.SQLiteDatabase, start: number, end: number) => {
    const s = await getAdvancedStats(database, start, end);
    setStats(s);
  };

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
        <Text className="text-3xl font-bold text-black dark:text-white mb-6">Payment Stats</Text>

        {/* Date Filters Card */}
        <View className="bg-white dark:bg-dark rounded-2xl p-4 shadow-3xl mb-6 border border-gray-100 dark:border-gray-800">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={18} color="#4361ee" />
              <Text className="text-base font-bold text-black dark:text-white">Filter Range</Text>
            </View>
          </View>

          {/* Quick Presets Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => applyDatePreset('today')} className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => applyDatePreset('7days')} className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => applyDatePreset('30days')} className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last 30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => applyDatePreset('month')} className="bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">This Month</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* From / To Input Cards */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowFromPicker(true)} className="flex-1 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Start Date</Text>
                <Text className="text-xs font-bold text-black dark:text-white" numberOfLines={1}>{formatDateLabel(fromDate)}</Text>
              </View>
              <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center ml-1">
                <Ionicons name="calendar-sharp" size={14} color="#4361ee" />
              </View>
            </TouchableOpacity>
            <Ionicons name="arrow-forward-outline" size={14} color="#9ca3af" />
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowToPicker(true)} className="flex-1 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 flex-row items-center justify-between">
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

        {/* Amount Stats */}
        <View className="mb-6">
          <View className="bg-primary p-6 rounded-2xl shadow-3xl mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.8)" />
              <Text className="text-white/80 font-bold uppercase tracking-wider text-sm">Total Transacted</Text>
            </View>
            <Text className="text-white text-4xl font-black">Ksh {stats.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
            <Text className="text-white/70 mt-2 text-xs font-semibold">{stats.total} Total Transactions</Text>
          </View>

          <View className="flex-row justify-between">
             <View className="w-[48%] bg-success p-5 rounded-2xl shadow-3xl">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="arrow-down-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 font-bold uppercase tracking-wider text-xs">Received</Text>
                </View>
                <Text className="text-white text-xl font-bold mb-1">Ksh {stats.receivedAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                <Text className="text-white/70 text-xs font-semibold">{stats.received} count</Text>
             </View>

             <View className="w-[48%] bg-danger p-5 rounded-2xl shadow-3xl">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="arrow-up-circle-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 font-bold uppercase tracking-wider text-xs">Sent</Text>
                </View>
                <Text className="text-white text-xl font-bold mb-1">Ksh {stats.sentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                <Text className="text-white/70 text-xs font-semibold">{stats.sent} count</Text>
             </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
