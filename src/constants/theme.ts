/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * These match the Vristo theme exactly.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0e1726',           // Vristo black
    background: '#fafafa',     // Vristo light page bg
    backgroundElement: '#eaf1ff', // Vristo primary.light
    backgroundSelected: '#e0e6ed', // Vristo white.light
    textSecondary: '#888ea8',  // Vristo white.dark
    primary: '#4361ee',        // Vristo primary
    panel: '#ffffff',          // Vristo panel bg
    border: '#e0e6ed',         // Vristo border
    tableHead: '#f6f8fa',      // Vristo table head bg
    muted: '#506690',          // Vristo muted text
  },
  dark: {
    text: '#e0e6ed',           // Vristo white.light
    background: '#060818',     // Vristo dark page bg
    backgroundElement: '#1b2e4b', // Vristo dark panel
    backgroundSelected: '#3b3f5c', // Vristo dark selected
    textSecondary: '#888ea8',  // Vristo white.dark
    primary: '#4361ee',        // Vristo primary
    panel: '#0e1726',          // Vristo dark panel (black)
    border: '#191e3a',         // Vristo dark border
    tableHead: '#1a2941',      // Vristo dark table head
    muted: '#506690',          // Vristo muted text
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Nunito_400Regular',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extrabold: 'Nunito_800ExtraBold',
    black: 'Nunito_900Black',
  },
  default: {
    sans: 'Nunito_400Regular',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extrabold: 'Nunito_800ExtraBold',
    black: 'Nunito_900Black',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
