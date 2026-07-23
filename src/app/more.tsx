import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

type CustomModalConfig = {
  visible: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'confirm' | 'update';
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
};

export default function MoreScreen() {
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [modalConfig, setModalConfig] = useState<CustomModalConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const showModal = (config: Omit<CustomModalConfig, 'visible'>) => {
    setModalConfig({ ...config, visible: true });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

  const handleClearCacheConfirm = () => {
    showModal({
      title: 'Clear App Cache?',
      message: 'Are you sure you want to clear cached temporary files? This will free up storage space on your device without deleting your saved database transactions.',
      type: 'warning',
      icon: '🗑️',
      confirmText: 'Clear Cache',
      cancelText: 'Cancel',
      onConfirm: async () => {
        closeModal();
        setClearingCache(true);
        try {
          const cacheDir = Paths.cache;
          const files = cacheDir.list();
          for (const file of files) {
            file.delete();
          }
          setTimeout(() => {
            showModal({
              title: 'Cache Cleared!',
              message: 'App cache files were successfully deleted.',
              type: 'success',
              icon: '✨',
              confirmText: 'Done',
            });
          }, 300);
        } catch (error) {
          console.error('Failed to clear cache:', error);
          setTimeout(() => {
            showModal({
              title: 'Clear Failed',
              message: 'An error occurred while clearing cache files.',
              type: 'danger',
              icon: '⚠️',
              confirmText: 'Close',
            });
          }, 300);
        } finally {
          setClearingCache(false);
        }
      },
    });
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      if (__DEV__) {
        showModal({
          title: 'Development Mode',
          message: 'Over-The-Air (OTA) updates are disabled while running in development mode.',
          type: 'info',
          icon: '🛠️',
          confirmText: 'Understood',
        });
        return;
      }

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        showModal({
          title: 'Update Available!',
          message: 'A new version of MPESA Extractor is available. Would you like to download and install it now?',
          type: 'update',
          icon: '🎁',
          confirmText: 'Download Update',
          cancelText: 'Later',
          onConfirm: async () => {
            closeModal();
            setCheckingUpdates(true);
            try {
              await Updates.fetchUpdateAsync();
              showModal({
                title: 'Update Ready!',
                message: 'The update has been downloaded. Restart the application now to apply the changes.',
                type: 'success',
                icon: '🔄',
                confirmText: 'Restart App Now',
                onConfirm: () => Updates.reloadAsync(),
              });
            } catch (e) {
              showModal({
                title: 'Download Failed',
                message: 'Failed to download the latest update. Please check your network connection.',
                type: 'danger',
                icon: '⚠️',
                confirmText: 'Close',
              });
            } finally {
              setCheckingUpdates(false);
            }
          },
        });
      } else {
        showModal({
          title: 'You are Up to Date!',
          message: `Your app is running the latest available version (v${appVersion}). No new updates found.`,
          type: 'success',
          icon: '🚀',
          confirmText: 'Awesome',
        });
      }
    } catch (error) {
      console.error('Update check failed:', error);
      showModal({
        title: 'Check Failed',
        message: 'Could not connect to update servers. Please verify your internet connection.',
        type: 'danger',
        icon: '📡',
        confirmText: 'OK',
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const getBadgeStyle = (type: CustomModalConfig['type']) => {
    switch (type) {
      case 'warning':
      case 'danger':
        return 'bg-danger/10 border-danger/20 text-danger';
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'update':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'info':
      default:
        return 'bg-info/10 border-info/20 text-info';
    }
  };

  const getButtonPrimaryStyle = (type: CustomModalConfig['type']) => {
    switch (type) {
      case 'warning':
      case 'danger':
        return 'bg-danger';
      case 'success':
        return 'bg-success';
      case 'update':
      case 'info':
      default:
        return 'bg-primary';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-3xl font-bold text-black dark:text-white mb-6">More</Text>

        {/* Section: Application Info & Actions */}
        <View className="bg-white dark:bg-dark rounded-2xl overflow-hidden shadow-3xl mb-6 border border-gray-100 dark:border-gray-800">
          {/* App Version */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Text className="text-lg">📱</Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-black dark:text-white">App Version</Text>
                <Text className="text-xs text-gray-500">Currently installed build</Text>
              </View>
            </View>
            <View className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300 font-bold text-xs">v{appVersion}</Text>
            </View>
          </View>

          {/* Check for Updates */}
          <TouchableOpacity
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-info/10 items-center justify-center">
                <Text className="text-lg">🔄</Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-black dark:text-white">Check for Updates</Text>
                <Text className="text-xs text-gray-500">Scan for OTA updates & bug fixes</Text>
              </View>
            </View>
            {checkingUpdates ? (
              <ActivityIndicator size="small" color="#4361ee" />
            ) : (
              <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                <Text className="text-primary font-bold text-xs">Check Now</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Clear Cache */}
          <TouchableOpacity
            onPress={handleClearCacheConfirm}
            disabled={clearingCache}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-danger/10 items-center justify-center">
                <Text className="text-lg">🧹</Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-danger">Clear Cache</Text>
                <Text className="text-xs text-gray-500">Remove temporary files to free space</Text>
              </View>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color="#ef233c" />
            ) : (
              <View className="bg-danger/10 px-3 py-1.5 rounded-full">
                <Text className="text-danger font-bold text-xs">Clear</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: About */}
        <View className="bg-white dark:bg-dark rounded-2xl p-5 shadow-3xl mb-6 border border-gray-100 dark:border-gray-800">
          <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">About App</Text>
          <Text className="text-gray-600 dark:text-gray-300 text-sm leading-5">
            MPESA Messages Extractor scans and parses MPESA transactions directly from your device SMS inbox into an offline SQLite database for fast search, reporting, and export.
          </Text>
        </View>

        <View className="items-center mt-6">
          <Text className="text-gray-400 text-xs text-center font-medium">
            MPESA Messages Extractor
          </Text>
          <Text className="text-gray-400 text-xs text-center mt-1">
            © {new Date().getFullYear()} Mpesa Sms Extractor
          </Text>
        </View>
      </ScrollView>

      {/* Styled Custom Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-5">
          <View className="bg-white dark:bg-[#121c2c] rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-800 items-center">
            {/* Top Glowing Icon Badge */}
            <View className={`w-16 h-16 rounded-full items-center justify-center border mb-4 ${getBadgeStyle(modalConfig.type)}`}>
              <Text className="text-3xl">{modalConfig.icon || '💬'}</Text>
            </View>

            {/* Title */}
            <Text className="text-xl font-extrabold text-black dark:text-white text-center mb-2">
              {modalConfig.title}
            </Text>

            {/* Message Body */}
            <Text className="text-gray-600 dark:text-gray-300 text-center text-sm leading-6 mb-6">
              {modalConfig.message}
            </Text>

            {/* Actions */}
            <View className="w-full flex-row gap-3">
              {modalConfig.cancelText && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center"
                  onPress={() => {
                    closeModal();
                  }}
                >
                  <Text className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                    {modalConfig.cancelText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                className={`flex-1 py-3 rounded-xl items-center shadow-lg ${getButtonPrimaryStyle(modalConfig.type)}`}
                onPress={async () => {
                  if (modalConfig.onConfirm) {
                    await modalConfig.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
              >
                <Text className="font-bold text-white text-sm">
                  {modalConfig.confirmText || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
