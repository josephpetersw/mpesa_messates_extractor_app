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
    d.setDate(1);
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

  const handleGenerate = () => {
    if (db) {
      loadStats(db, fromDate.getTime(), toDate.getTime());
    }
  };

  const formatKsh = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
          <Text className="text-2xl font-nunito-black text-black dark:text-white-light">Payment Stats</Text>
          <Text className="text-sm font-nunito text-vristo-muted mt-0.5">Summary of your MPESA activity</Text>
        </View>

        {/* Date Filters Panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel mb-6 overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          <View className="flex-row items-center gap-2 px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark">
            <Ionicons name="calendar-outline" size={16} color="#4361ee" />
            <Text className="text-sm font-nunito-bold text-black dark:text-white-light">Filter Range</Text>
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

            {/* From / To */}
            <View className="flex-row items-center gap-2 mb-4">
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

            {/* Generate Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGenerate}
              className="bg-primary flex-row justify-center items-center py-3 rounded-md shadow-sm gap-2"
            >
              <Ionicons name="stats-chart" size={16} color="#ffffff" />
              <Text className="text-white font-nunito-bold text-sm tracking-wide">Generate Stats</Text>
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

        {/* Total Transacted — Vristo gradient blue card */}
        <View
          className="rounded-md overflow-hidden mb-4 shadow-panel"
          style={{ backgroundColor: '#4361ee' }}
        >
          {/* Decorative blob */}
          <View className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5" />
          <View className="absolute -right-4 top-10 w-24 h-24 rounded-full bg-white/5" />

          <View className="p-6 z-10">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.9)" />
              </View>
              <Text className="text-white/80 font-nunito-bold text-sm uppercase tracking-widest">Total Transacted</Text>
            </View>
            <Text className="text-white text-4xl font-nunito-black">
              Ksh {formatKsh(stats.totalAmount)}
            </Text>
            <View className="flex-row items-center mt-3 gap-2">
              <View className="bg-white/20 px-2.5 py-1 rounded">
                <Text className="text-white/90 font-nunito-bold text-xs">{stats.total} transactions</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Received / Sent Row */}
        <View className="flex-row gap-4 mb-6">
          {/* Received */}
          <View className="flex-1 bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel border border-vristo-border dark:border-vristo-border-dark overflow-hidden">
            <View className="h-1 bg-success" />
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-nunito-bold text-vristo-muted uppercase tracking-widest">Received</Text>
                <View className="w-9 h-9 rounded-full bg-success/10 items-center justify-center">
                  <Ionicons name="arrow-down-circle-outline" size={18} color="#00ab55" />
                </View>
              </View>
              <Text className="text-success text-2xl font-nunito-black mb-1">
                Ksh {formatKsh(stats.receivedAmount)}
              </Text>
              <View className="flex-row items-center gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-success" />
                <Text className="text-vristo-muted font-nunito text-xs">{stats.received} transactions</Text>
              </View>
            </View>
          </View>

          {/* Sent */}
          <View className="flex-1 bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel border border-vristo-border dark:border-vristo-border-dark overflow-hidden">
            <View className="h-1 bg-danger" />
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-nunito-bold text-vristo-muted uppercase tracking-widest">Sent</Text>
                <View className="w-9 h-9 rounded-full bg-danger/10 items-center justify-center">
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#e7515a" />
                </View>
              </View>
              <Text className="text-danger text-2xl font-nunito-black mb-1">
                Ksh {formatKsh(stats.sentAmount)}
              </Text>
              <View className="flex-row items-center gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-danger" />
                <Text className="text-vristo-muted font-nunito text-xs">{stats.sent} transactions</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Summary breakdown panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel border border-vristo-border dark:border-vristo-border-dark overflow-hidden mb-6">
          <View className="px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark">
            <Text className="text-sm font-nunito-bold text-black dark:text-white-light">Breakdown</Text>
          </View>
          {[
            { label: 'Total Transactions', value: stats.total.toString(), icon: 'swap-horizontal-outline' as const, color: '#4361ee' },
            { label: 'Money Received', value: `Ksh ${formatKsh(stats.receivedAmount)}`, icon: 'arrow-down-circle-outline' as const, color: '#00ab55' },
            { label: 'Money Sent', value: `Ksh ${formatKsh(stats.sentAmount)}`, icon: 'arrow-up-circle-outline' as const, color: '#e7515a' },
            { label: 'Net Flow', value: `Ksh ${formatKsh(stats.receivedAmount - stats.sentAmount)}`, icon: 'trending-up-outline' as const, color: stats.receivedAmount >= stats.sentAmount ? '#00ab55' : '#e7515a' },
          ].map(({ label, value, icon, color }, idx) => (
            <View key={idx} className="flex-row items-center px-5 py-3.5 border-b border-vristo-border/40 dark:border-vristo-border-dark">
              <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${color}18` }}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <Text className="flex-1 text-sm font-nunito-semibold text-vristo-muted">{label}</Text>
              <Text className="text-sm font-nunito-bold text-black dark:text-white-light">{value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
