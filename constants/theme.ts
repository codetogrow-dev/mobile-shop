// ─── Color Palette ───────────────────────────────────────────────────────────

export const colors = {
  // Primary — Electric Blue
  primary50: '#E6F9FF',
  primary100: '#B3EDFF',
  primary200: '#7FDFFF',
  primary300: '#4CD2FF',
  primary400: '#1AC6FF',
  primary500: '#00B4E6', // main brand
  primary600: '#0097C4', // pressed / active
  primary700: '#007BA3',
  primary800: '#005F81',
  primary900: '#004460',

  // Accent — Neon Cyan (KPI numbers, highlights)
  accent: '#00F5FF',
  accentDim: '#00D9E5',

  // Surfaces
  bgBase: '#F4F8FB',
  bgCard: '#FFFFFF',
  bgElevated: '#EEF4F9',
  border: '#D6E4EF',
  borderFocus: '#00B4E6',

  // Text
  textPrimary: '#0D1B2A',
  textSecondary: '#4A6278',
  textTertiary: '#8CA3B4',
  textInverse: '#FFFFFF',
  textAccent: '#00B4E6',

  // Semantic
  success: '#00C48C',
  successBg: '#E6FAF4',
  warning: '#FFB800',
  warningBg: '#FFF8E6',
  danger: '#FF4757',
  dangerBg: '#FFF0F1',
  info: '#3D8EF0',
  infoBg: '#EBF3FE',

  // Chart palette (ordered)
  chart: ['#00B4E6', '#00F5FF', '#00C48C', '#FFB800', '#FF4757', '#7C5CBF', '#3D8EF0'],

  // Overlays
  overlay: 'rgba(13, 27, 42, 0.5)',
  overlayLight: 'rgba(13, 27, 42, 0.08)',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const fontFamily = {
  light: 'Montserrat_300Light',
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extraBold: 'Montserrat_800ExtraBold',
} as const;

export type TextType =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bodyLg'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'overline'
  | 'numericLg'
  | 'numeric'
  | 'numericSm';

export const typography: Record<
  TextType,
  { fontSize: number; lineHeight: number; fontFamily: string; letterSpacing?: number }
> = {
  display:  { fontSize: 36, lineHeight: 44, fontFamily: fontFamily.extraBold },
  h1:       { fontSize: 28, lineHeight: 36, fontFamily: fontFamily.bold },
  h2:       { fontSize: 22, lineHeight: 30, fontFamily: fontFamily.bold },
  h3:       { fontSize: 18, lineHeight: 26, fontFamily: fontFamily.semiBold },
  h4:       { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semiBold },
  bodyLg:   { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  body:     { fontSize: 14, lineHeight: 22, fontFamily: fontFamily.regular },
  bodySm:   { fontSize: 13, lineHeight: 20, fontFamily: fontFamily.regular },
  caption:  { fontSize: 12, lineHeight: 18, fontFamily: fontFamily.medium },
  overline: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily.semiBold, letterSpacing: 0.8 },
  numericLg:{ fontSize: 32, lineHeight: 40, fontFamily: fontFamily.extraBold },
  numeric:  { fontSize: 20, lineHeight: 28, fontFamily: fontFamily.bold },
  numericSm:{ fontSize: 14, lineHeight: 20, fontFamily: fontFamily.semiBold },
};

// ─── Spacing (4px base unit) ─────────────────────────────────────────────────

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#00B4E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#00B4E6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

export const tabBar = {
  height: 64,
  paddingBottom: 8,
} as const;
