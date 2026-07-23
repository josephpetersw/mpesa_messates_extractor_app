import React from 'react';
import { View, Text, Modal, TouchableOpacity, useColorScheme } from 'react-native';
import { Calendar } from 'react-native-calendars';

interface CustomDatePickerProps {
  visible: boolean;
  currentDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title: string;
}

export default function CustomDatePicker({ visible, currentDate, onClose, onSelect, title }: CustomDatePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    backgroundColor: isDark ? '#111111' : '#ffffff',
    calendarBackground: isDark ? '#111111' : '#ffffff',
    textSectionTitleColor: isDark ? '#9ca3af' : '#6b7280',
    selectedDayBackgroundColor: '#4361ee',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#4361ee',
    dayTextColor: isDark ? '#ffffff' : '#000000',
    textDisabledColor: isDark ? '#333333' : '#d1d5db',
    arrowColor: '#4361ee',
    monthTextColor: isDark ? '#ffffff' : '#000000',
    indicatorColor: '#4361ee',
  };

  const currentDateString = currentDate.toISOString().split('T')[0];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white dark:bg-[#111111] rounded-2xl w-full max-w-sm p-4 shadow-3xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-black dark:text-white pl-2">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Text className="text-gray-500 dark:text-gray-400 font-bold">✕</Text>
            </TouchableOpacity>
          </View>
          
          <Calendar
            current={currentDateString}
            maxDate={new Date().toISOString().split('T')[0]}
            onDayPress={(day: any) => {
              const selected = new Date(day.timestamp);
              onSelect(selected);
            }}
            markedDates={{
              [currentDateString]: { selected: true, disableTouchEvent: true }
            }}
            theme={theme}
          />
        </View>
      </View>
    </Modal>
  );
}
