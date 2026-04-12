export const colors = {
  background: '#F3F4F8',
  surface: 'rgba(255,255,255,0.72)',
  surfaceStrong: '#FFFFFF',
  cardBorder: 'rgba(255,255,255,0.7)',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  income: '#22C55E',
  expense: '#111827',
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  shadow: 'rgba(15, 23, 42, 0.08)',
  divider: 'rgba(148, 163, 184, 0.16)',
}

export const radii = {
  xl: 28,
  lg: 22,
  md: 18,
  sm: 14,
  pill: 999,
}

export const spacing = {
  page: 20,
  pageTop: 24,
  pageBottom: 160,
  section: 18,
  card: 18,
  cardCompact: 16,
  gap: 12,
  gapTight: 8,
  gapLoose: 16,
}

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  fab: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
}

function scaleFontSize(size: number, scale: number) {
  return Math.round(size * scale)
}

export function createTypography(scale = 1) {
  return {
    hero: {
      fontSize: scaleFontSize(28, scale),
      lineHeight: scaleFontSize(34, scale),
      fontWeight: '700' as const,
    },
    title: {
      fontSize: scaleFontSize(24, scale),
      lineHeight: scaleFontSize(30, scale),
      fontWeight: '700' as const,
    },
    sectionTitle: {
      fontSize: scaleFontSize(16, scale),
      lineHeight: scaleFontSize(22, scale),
      fontWeight: '700' as const,
    },
    cardTitle: {
      fontSize: scaleFontSize(15, scale),
      lineHeight: scaleFontSize(20, scale),
      fontWeight: '600' as const,
    },
    body: {
      fontSize: scaleFontSize(14, scale),
      lineHeight: scaleFontSize(20, scale),
      fontWeight: '400' as const,
    },
    bodyStrong: {
      fontSize: scaleFontSize(14, scale),
      lineHeight: scaleFontSize(20, scale),
      fontWeight: '600' as const,
    },
    caption: {
      fontSize: scaleFontSize(12, scale),
      lineHeight: scaleFontSize(17, scale),
      fontWeight: '400' as const,
    },
    captionStrong: {
      fontSize: scaleFontSize(12, scale),
      lineHeight: scaleFontSize(17, scale),
      fontWeight: '600' as const,
    },
    footnote: {
      fontSize: scaleFontSize(11, scale),
      lineHeight: scaleFontSize(15, scale),
      fontWeight: '400' as const,
    },
    amountLarge: {
      fontSize: scaleFontSize(28, scale),
      lineHeight: scaleFontSize(34, scale),
      fontWeight: '700' as const,
    },
    amountMedium: {
      fontSize: scaleFontSize(20, scale),
      lineHeight: scaleFontSize(26, scale),
      fontWeight: '700' as const,
    },
    tabLabel: {
      fontSize: scaleFontSize(11, Math.min(scale, 1.1)),
      lineHeight: scaleFontSize(14, Math.min(scale, 1.1)),
      fontWeight: '500' as const,
    },
  }
}

export const typography = createTypography()
