import type { ClipboardItem, StorageData } from '../types';

const STORAGE_KEY = 'clipboard_history';
const DEFAULT_MAX_ITEMS = 100;

export async function getClipboardHistory(): Promise<ClipboardItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  return data.items;
}

export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
}

export async function saveClipboardItem(text: string): Promise<{ saved: boolean; isDuplicate: boolean }> {
  if (!text || text.trim().length === 0) {
    return { saved: false, isDuplicate: false };
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  
  const trimmedText = text.trim();
  const now = Date.now();
  
  const existingIndex = data.items.findIndex(item => item.text === trimmedText);
  
  if (existingIndex !== -1) {
    const existingItem = data.items[existingIndex];
    
    if (existingIndex === 0 && (now - existingItem.timestamp) < 1000) {
      return { saved: false, isDuplicate: true };
    }
    
    data.items.splice(existingIndex, 1);
    existingItem.timestamp = now;
    data.items.unshift(existingItem);
    
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { saved: true, isDuplicate: true };
  }
  const newItem: ClipboardItem = {
    id: `${now}-${Math.random().toString(36).substring(2, 11)}`,
    text: trimmedText,
    timestamp: now,
    isStarred: false
  };

  data.items.unshift(newItem);

  const starredItems = data.items.filter(item => item.isStarred);
  const nonStarredItems = data.items.filter(item => !item.isStarred);
  
  if (nonStarredItems.length > data.maxItems) {
    nonStarredItems.splice(data.maxItems);
  }
  
  data.items = [...starredItems, ...nonStarredItems];

  await chrome.storage.local.set({ [STORAGE_KEY]: data });
  return { saved: true, isDuplicate: false };
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  
  data.items = data.items.filter(item => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

export async function clearClipboardHistory(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: { items: [], maxItems: DEFAULT_MAX_ITEMS } });
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

const FREE_MAX_STARRED = 3;

export async function toggleStarredItem(id: string): Promise<{ success: boolean; isStarred: boolean; limitReached: boolean }> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  
  const itemIndex = data.items.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return { success: false, isStarred: false, limitReached: false };
  }
  
  const item = data.items[itemIndex];
  const currentlyStarred = item.isStarred || false;
  
  if (currentlyStarred) {
    item.isStarred = false;
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { success: true, isStarred: false, limitReached: false };
  }
  
  const starredCount = data.items.filter(i => i.isStarred).length;
  if (starredCount >= FREE_MAX_STARRED) {
    return { success: false, isStarred: false, limitReached: true };
  }
  
  item.isStarred = true;
  data.items.splice(itemIndex, 1);
  data.items.unshift(item);
  
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
  return { success: true, isStarred: true, limitReached: false };
}

// Settings storage
const SETTINGS_KEY = 'clipboard_settings';

export interface Settings {
  autoSave: boolean;
  showToasts: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: Settings = {
  autoSave: true,
  showToasts: true,
  theme: 'dark',
};

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}
