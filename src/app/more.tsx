import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { useThemePreference, ThemePreference } from '../context/ThemeContext';

type IoniconsName = keyof typeof Ionicons.glyphMap;

type CustomModalConfig = {
  visible: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'confirm' | 'update';
  icon?: IoniconsName;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
};

export default function MoreScreen() {
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const { preference, setPreference } = useThemePreference();
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
      icon: 'trash-outline',
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
              icon: 'checkmark-circle-outline',
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
              icon: 'alert-circle-outline',
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
          icon: 'construct-outline',
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
          icon: 'cloud-download-outline',
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
                icon: 'reload-circle-outline',
                confirmText: 'Restart App Now',
                onConfirm: () => Updates.reloadAsync(),
              });
            } catch (e) {
              showModal({
                title: 'Download Failed',
                message: 'Failed to download the latest update. Please check your network connection.',
                type: 'danger',
                icon: 'alert-circle-outline',
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
          icon: 'checkmark-done-circle-outline',
          confirmText: 'Awesome',
        });
      }
    } catch (error) {
      console.error('Update check failed:', error);
      showModal({
        title: 'Check Failed',
        message: 'Could not connect to update servers. Please verify your internet connection.',
        type: 'danger',
        icon: 'wifi-outline',
        confirmText: 'OK',
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const getModalColors = (type: CustomModalConfig['type']) => {
    switch (type) {
      case 'warning':
      case 'danger':
        return { iconBg: 'bg-danger/10', iconColor: '#e7515a', btnBg: 'bg-danger' };
      case 'success':
        return { iconBg: 'bg-success/10', iconColor: '#00ab55', btnBg: 'bg-success' };
      case 'update':
      case 'info':
      default:
        return { iconBg: 'bg-primary/10', iconColor: '#4361ee', btnBg: 'bg-primary' };
    }
  };

  const currentColors = getModalColors(modalConfig.type);

  return (
    <SafeAreaView className="flex-1 bg-vristo-bg dark:bg-vristo-bg-dark">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-nunito-black text-black dark:text-white-light">More</Text>
          <Text className="text-sm font-nunito text-vristo-muted mt-0.5">App settings and information</Text>
        </View>

        {/* Appearance Panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel mb-6 overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          <View className="px-5 py-3 bg-vristo-table-head dark:bg-vristo-table-head-dark border-b border-vristo-border dark:border-vristo-border-dark flex-row items-center gap-2">
            <Ionicons name="color-palette-outline" size={14} color="#506690" />
            <Text className="text-xs font-nunito-bold text-vristo-muted uppercase tracking-widest">Appearance</Text>
          </View>

          <View className="px-5 py-4">
            <Text className="text-sm font-nunito-semibold text-black dark:text-white-light mb-1">Theme Mode</Text>
            <Text className="text-xs font-nunito text-vristo-muted mb-4">Choose how the app looks on your device</Text>

            <View className="flex-row gap-3">
              {([
                { key: 'light', label: 'Light', icon: 'sunny-outline' },
                { key: 'dark',  label: 'Dark',  icon: 'moon-outline' },
                { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
              ] as { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map(({ key, label, icon }) => {
                const isActive = preference === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setPreference(key)}
                    activeOpacity={0.8}
                    className={`flex-1 items-center py-3 rounded-md border ${
                      isActive
                        ? 'bg-primary border-primary'
                        : 'bg-[#f6f8fa] dark:bg-[#1a2941] border-vristo-border dark:border-vristo-border-dark'
                    }`}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={isActive ? '#ffffff' : '#506690'}
                    />
                    <Text className={`text-xs font-nunito-bold mt-1.5 ${
                      isActive ? 'text-white' : 'text-vristo-muted'
                    }`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* App Management Panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel mb-6 overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          
          {/* Section Label */}
          <View className="px-5 py-3 bg-vristo-table-head dark:bg-vristo-table-head-dark border-b border-vristo-border dark:border-vristo-border-dark">
            <Text className="text-xs font-nunito-bold text-vristo-muted uppercase tracking-widest">App Management</Text>
          </View>

          {/* App Version Row */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded bg-primary/10 items-center justify-center">
                <Ionicons name="phone-portrait-outline" size={18} color="#4361ee" />
              </View>
              <View>
                <Text className="text-sm font-nunito-semibold text-black dark:text-white-light">App Version</Text>
                <Text className="text-xs font-nunito text-vristo-muted">Currently installed build</Text>
              </View>
            </View>
            <View className="bg-[#f6f8fa] dark:bg-[#1a2941] px-3 py-1 rounded border border-vristo-border dark:border-vristo-border-dark">
              <Text className="text-vristo-muted font-nunito-bold text-xs">v{appVersion}</Text>
            </View>
          </View>

          {/* Check for Updates Row */}
          <TouchableOpacity
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            activeOpacity={0.7}
            className="flex-row items-center justify-between px-5 py-4 border-b border-vristo-border dark:border-vristo-border-dark"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded bg-info/10 items-center justify-center">
                <Ionicons name="refresh-outline" size={18} color="#2196f3" />
              </View>
              <View>
                <Text className="text-sm font-nunito-semibold text-black dark:text-white-light">Check for Updates</Text>
                <Text className="text-xs font-nunito text-vristo-muted">Scan for OTA updates & bug fixes</Text>
              </View>
            </View>
            {checkingUpdates ? (
              <ActivityIndicator size="small" color="#4361ee" />
            ) : (
              <View className="bg-info/10 px-3 py-1 rounded border border-info/20">
                <Text className="text-info font-nunito-bold text-xs">Check Now</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Clear Cache Row */}
          <TouchableOpacity
            onPress={handleClearCacheConfirm}
            disabled={clearingCache}
            activeOpacity={0.7}
            className="flex-row items-center justify-between px-5 py-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded bg-danger/10 items-center justify-center">
                <Ionicons name="trash-outline" size={18} color="#e7515a" />
              </View>
              <View>
                <Text className="text-sm font-nunito-semibold text-danger">Clear Cache</Text>
                <Text className="text-xs font-nunito text-vristo-muted">Remove temporary files to free space</Text>
              </View>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color="#e7515a" />
            ) : (
              <View className="bg-danger/10 px-3 py-1 rounded border border-danger/20">
                <Text className="text-danger font-nunito-bold text-xs">Clear</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* About Panel */}
        <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md shadow-panel mb-6 overflow-hidden border border-vristo-border dark:border-vristo-border-dark">
          <View className="px-5 py-3 bg-vristo-table-head dark:bg-vristo-table-head-dark border-b border-vristo-border dark:border-vristo-border-dark flex-row items-center gap-2">
            <Ionicons name="information-circle-outline" size={14} color="#506690" />
            <Text className="text-xs font-nunito-bold text-vristo-muted uppercase tracking-widest">About App</Text>
          </View>
          <View className="px-5 py-4">
            <Text className="text-sm font-nunito text-vristo-muted leading-6">
              MPESA Messages Extractor scans and parses MPESA transactions directly from your device SMS inbox into an offline SQLite database for fast search, reporting, and export.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-4 mb-2">
          <Text className="text-vristo-muted font-nunito text-xs text-center">MPESA Messages Extractor</Text>
          <Text className="text-vristo-muted font-nunito text-xs text-center mt-0.5">
            © {new Date().getFullYear()} Mpesa Sms Extractor
          </Text>
        </View>

      </ScrollView>

      {/* Styled Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-5">
          <View className="bg-vristo-panel dark:bg-vristo-panel-dark rounded-md w-full max-w-sm p-6 shadow-3xl border border-vristo-border dark:border-vristo-border-dark items-center">
            
            {/* Icon */}
            <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${currentColors.iconBg}`}>
              <Ionicons 
                name={modalConfig.icon || 'information-circle-outline'} 
                size={30} 
                color={currentColors.iconColor} 
              />
            </View>

            <Text className="text-lg font-nunito-black text-black dark:text-white-light text-center mb-2">
              {modalConfig.title}
            </Text>

            <Text className="text-vristo-muted font-nunito text-center text-sm leading-6 mb-6">
              {modalConfig.message}
            </Text>

            <View className="w-full flex-row gap-3">
              {modalConfig.cancelText && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 py-2.5 rounded-md border border-vristo-border dark:border-vristo-border-dark items-center"
                  onPress={closeModal}
                >
                  <Text className="font-nunito-bold text-vristo-muted text-sm">
                    {modalConfig.cancelText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                className={`flex-1 py-2.5 rounded-md items-center ${currentColors.btnBg}`}
                onPress={async () => {
                  if (modalConfig.onConfirm) {
                    await modalConfig.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
              >
                <Text className="font-nunito-bold text-white text-sm">
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
