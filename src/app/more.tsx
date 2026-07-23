import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Paths, Directory } from 'expo-file-system';
import * as Updates from 'expo-updates';

export default function MoreScreen() {
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      // Using the new Expo FileSystem API to clear cache directory
      const cacheDir = Paths.cache;
      const files = cacheDir.list();
      
      for (const file of files) {
        file.delete();
      }
      
      Alert.alert('Success', 'Cache cleared successfully.');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      Alert.alert('Error', 'Failed to clear cache.');
    } finally {
      setClearingCache(false);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      if (__DEV__) {
        Alert.alert('Info', 'OTA updates are not available in development mode.');
        return;
      }
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version is available. Would you like to download it now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Download', 
              onPress: async () => {
                setCheckingUpdates(true);
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Downloaded',
                    'The app will now restart to apply the update.',
                    [{ text: 'Restart', onPress: () => Updates.reloadAsync() }]
                  );
                } catch (e) {
                  Alert.alert('Error', 'Failed to download the update.');
                } finally {
                  setCheckingUpdates(false);
                }
              } 
            }
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are running the latest version of the app.');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      Alert.alert('Error', 'Failed to check for updates. Please try again later.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-3xl font-bold text-black dark:text-white mb-6">More</Text>
        
        <View className="bg-white dark:bg-dark rounded-xl overflow-hidden shadow-3xl mb-6">
          {/* App Version */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <View>
              <Text className="text-lg font-semibold text-black dark:text-white">App Version</Text>
              <Text className="text-sm text-gray-500">Current version installed</Text>
            </View>
            <Text className="text-gray-400 font-bold">{appVersion}</Text>
          </View>

          {/* Check for Updates */}
          <TouchableOpacity 
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800"
          >
            <View>
              <Text className="text-lg font-semibold text-black dark:text-white">Check for Updates</Text>
              <Text className="text-sm text-gray-500">See if a newer version is available</Text>
            </View>
            {checkingUpdates ? (
              <ActivityIndicator size="small" color="#4361ee" />
            ) : (
              <Text className="text-primary font-bold">Check</Text>
            )}
          </TouchableOpacity>

          {/* Clear Cache */}
          <TouchableOpacity 
            onPress={handleClearCache}
            disabled={clearingCache}
            className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800"
          >
            <View>
              <Text className="text-lg font-semibold text-danger">Clear Cache</Text>
              <Text className="text-sm text-gray-500">Free up space on your device</Text>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color="#ef233c" />
            ) : (
              <Text className="text-danger font-bold">Clear</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="items-center mt-8">
          <Text className="text-gray-400 text-xs text-center">
            MPESA Messages Extractor
          </Text>
          <Text className="text-gray-400 text-xs text-center mt-1">
            © {new Date().getFullYear()} Mpesa Sms Extractor
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
