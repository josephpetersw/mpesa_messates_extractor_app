import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { ThemeProvider as AppThemeProvider } from '@/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

// Vristo-themed navigation theme
const VristoLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#fafafa',
    card: '#ffffff',
    text: '#0e1726',
    border: '#e0e6ed',
    primary: '#4361ee',
  },
};

const VristoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#060818',
    card: '#0e1726',
    text: '#e0e6ed',
    border: '#191e3a',
    primary: '#4361ee',
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!loaded) return null;

  return (
    <AppThemeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? VristoDarkTheme : VristoLightTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </AppThemeProvider>
  );
}
