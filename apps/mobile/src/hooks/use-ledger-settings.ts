import { useCallback, useEffect, useState } from 'react'
import { loadCategories, loadTags, saveCategories, saveTags } from '../lib/ledger-settings'

function appendUnique(items: string[], next: string) {
  const value = next.trim()
  if (!value || items.includes(value)) {
    return items
  }

  return [...items, value]
}

export function useLedgerSettings() {
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [nextCategories, nextTags] = await Promise.all([loadCategories(), loadTags()])
    setCategories(nextCategories)
    setTags(nextTags)
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addCategory = useCallback(async (name: string) => {
    const next = appendUnique(categories, name)
    setCategories(next)
    await saveCategories(next)
  }, [categories])

  const removeCategory = useCallback(async (name: string) => {
    const next = categories.filter((item) => item !== name)
    setCategories(next)
    await saveCategories(next)
  }, [categories])

  const addTag = useCallback(async (name: string) => {
    const next = appendUnique(tags, name)
    setTags(next)
    await saveTags(next)
  }, [tags])

  const removeTag = useCallback(async (name: string) => {
    const next = tags.filter((item) => item !== name)
    setTags(next)
    await saveTags(next)
  }, [tags])

  return {
    categories,
    tags,
    loaded,
    refresh,
    addCategory,
    removeCategory,
    addTag,
    removeTag,
  }
}
