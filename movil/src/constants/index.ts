import { Zone } from '../types';

export const COLORS = {
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // Accent
  accent: '#00CEC9',
  accentLight: '#55EFC4',

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  danger: '#FF7675',
  info: '#74B9FF',

  // Dark theme
  background: '#0A0A1A',
  surface: '#1A1A2E',
  surfaceLight: '#2A2A3E',
  card: 'rgba(30, 30, 50, 0.8)',
  cardBorder: 'rgba(108, 92, 231, 0.2)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textMuted: '#6C6C80',

  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const GRADIENTS = {
  primary: ['#6C5CE7', '#A29BFE'],
  dark: ['#0A0A1A', '#1A1A2E'],
  accent: ['#00CEC9', '#55EFC4'],
  success: ['#00B894', '#55EFC4'],
  danger: ['#FF7675', '#D63031'],
  cardGlow: ['rgba(108, 92, 231, 0.3)', 'rgba(162, 155, 254, 0.1)', 'transparent'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  title: 36,
};

// Default zones (demo coordinates - Mexico City center)
export const DEFAULT_ZONES: Zone[] = [];
// User will add zones later

export const FACE_MATCH_THRESHOLD = 0.6; // Lower = more strict
export const ZONE_DEFAULT_RADIUS = 50; // meters
export const LOCATION_UPDATE_INTERVAL = 3000; // ms
export const LOCATION_DISTANCE_FILTER = 5; // meters
