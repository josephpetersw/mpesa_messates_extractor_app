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
    backgroundColor: isDark ? '#1b2e4b' : '#ffffff',
    calendarBackground: isDark ? '#1b2e4b' : '#ffffff',
    textSectionTitleColor: isDark ? '#888ea8' : '#506690',
    selectedDayBackgroundColor: '#4361ee',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#4361ee',
    dayTextColor: isDark ? '#e0e6ed' : '#0e1726',
    textDisabledColor: isDark ? '#3b3f5c' : '#e0e6ed',
    arrowColor: '#4361ee',
    monthTextColor: isDark ? '#e0e6ed' : '#0e1726',
    indicatorColor: '#4361ee',
    textDayFontFamily: 'Nunito_400Regular',
    textMonthFontFamily: 'Nunito_700Bold',
    textDayHeaderFontFamily: 'Nunito_600SemiBold',
  };

  const currentDateString = currentDate.toISOString().split('T')[0];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/60 p-4">
        <View
          className="rounded-md w-full max-w-sm p-4 shadow-3xl border border-vristo-border dark:border-vristo-border-dark"
          style={{ backgroundColor: isDark ? '#1b2e4b' : '#ffffff' }}
        >
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-vristo-border dark:border-vristo-border-dark">
            <Text className="text-base font-nunito-bold text-black dark:text-white-light">{title}</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-[#f6f8fa] dark:bg-[#1a2941] rounded items-center justify-center">
              <Text className="text-vristo-muted font-nunito-bold text-sm">✕</Text>
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
