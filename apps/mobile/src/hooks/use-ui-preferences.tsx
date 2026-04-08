import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createTypography } from '../theme/tokens'

const UI_FONT_SCALE_STORAGE_KEY = 'bookkeeping.ui.font-scale'

export const fontScaleOptions = [
  { key: 'standard', label: '标准', scale: 1 },
  { key: 'large', label: '偏大', scale: 1.08 },
  { key: 'extraLarge', label: '超大', scale: 1.16 },
] as const

export type FontScaleKey = typeof fontScaleOptions[number]['key']

type UIPreferencesContextValue = {
  fontScaleKey: FontScaleKey
  fontScale: number
  typography: ReturnType<typeof createTypography>
  setFontScaleKey: (next: FontScaleKey) => Promise<void>
}

const defaultOption = fontScaleOptions[0]

const UIPreferencesContext = createContext<UIPreferencesContextValue>({
  fontScaleKey: defaultOption.key,
  fontScale: defaultOption.scale,
  typography: createTypography(defaultOption.scale),
  setFontScaleKey: async () => undefined,
})

export function UIPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [fontScaleKey, setFontScaleKeyState] = useState<FontScaleKey>(defaultOption.key)

  useEffect(() => {
    async function loadPreferences() {
      const raw = await AsyncStorage.getItem(UI_FONT_SCALE_STORAGE_KEY)
      const matched = fontScaleOptions.find((option) => option.key === raw)
      if (matched) {
        setFontScaleKeyState(matched.key)
      }
    }

    void loadPreferences()
  }, [])

  const setFontScaleKey = useCallback(async (next: FontScaleKey) => {
    setFontScaleKeyState(next)
    await AsyncStorage.setItem(UI_FONT_SCALE_STORAGE_KEY, next)
  }, [])

  const activeOption = fontScaleOptions.find((option) => option.key === fontScaleKey) ?? defaultOption

  const value = useMemo(() => ({
    fontScaleKey: activeOption.key,
    fontScale: activeOption.scale,
    typography: createTypography(activeOption.scale),
    setFontScaleKey,
  }), [activeOption.key, activeOption.scale, setFontScaleKey])

  return <UIPreferencesContext.Provider value={value}>{children}</UIPreferencesContext.Provider>
}

export function useUIPreferences() {
  return useContext(UIPreferencesContext)
}
