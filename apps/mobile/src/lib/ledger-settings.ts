import AsyncStorage from '@react-native-async-storage/async-storage'

const CATEGORY_STORAGE_KEY = 'bookkeeping.ledger.categories'
const TAG_STORAGE_KEY = 'bookkeeping.ledger.tags'

const defaultCategories = ['餐饮', '交通', '购物', '娱乐', '房租', '咖啡', '宠物', '旅行', '社交', '医疗', '学习', '日用', '工资']
const defaultTags = ['旅游', '通勤', '服饰', '聚餐']

async function loadList(storageKey: string, fallback: string[]) {
  const raw = await AsyncStorage.getItem(storageKey)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as string[]
    const normalized = Array.isArray(parsed)
      ? [...new Set(parsed.map((item) => item.trim()).filter(Boolean))]
      : []

    return normalized.length ? normalized : fallback
  } catch {
    return fallback
  }
}

async function saveList(storageKey: string, items: string[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(items))
}

export async function loadCategories() {
  return loadList(CATEGORY_STORAGE_KEY, defaultCategories)
}

export async function saveCategories(categories: string[]) {
  await saveList(CATEGORY_STORAGE_KEY, categories)
}

export async function loadTags() {
  return loadList(TAG_STORAGE_KEY, defaultTags)
}

export async function saveTags(tags: string[]) {
  await saveList(TAG_STORAGE_KEY, tags)
}
