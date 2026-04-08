import { useCallback, useEffect, useState } from 'react'
import { emptyAIConfig, loadAIConfig, saveAIConfig, type StoredAIConfig } from '../lib/ai-config'

export function useAIConfig() {
  const [config, setConfig] = useState<StoredAIConfig>(emptyAIConfig)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const next = await loadAIConfig()
    setConfig(next)
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateConfig = useCallback(async (next: StoredAIConfig) => {
    await saveAIConfig(next)
    setConfig(next)
  }, [])

  return {
    config,
    loaded,
    refresh,
    updateConfig,
  }
}
