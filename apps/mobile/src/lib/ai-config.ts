import AsyncStorage from '@react-native-async-storage/async-storage'
import type { OpenAICompatibleConfig } from '../../../../packages/ai/src'

const AI_CONFIG_STORAGE_KEY = 'bookkeeping.ai.config'

export type StoredAIConfig = OpenAICompatibleConfig

export const emptyAIConfig: StoredAIConfig = {
  apiKey: '',
  baseURL: 'https://bwen.net/v1',
  model: 'gpt-5.4',
}

export async function loadAIConfig(): Promise<StoredAIConfig> {
  const raw = await AsyncStorage.getItem(AI_CONFIG_STORAGE_KEY)
  if (!raw) {
    return emptyAIConfig
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAIConfig>
    return {
      apiKey: parsed.apiKey ?? '',
      baseURL: parsed.baseURL ?? emptyAIConfig.baseURL,
      model: parsed.model ?? emptyAIConfig.model,
    }
  } catch {
    return emptyAIConfig
  }
}

export async function saveAIConfig(config: StoredAIConfig) {
  await AsyncStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
}

export function hasAIConfig(config: StoredAIConfig) {
  return Boolean(config.apiKey && config.baseURL && config.model)
}
