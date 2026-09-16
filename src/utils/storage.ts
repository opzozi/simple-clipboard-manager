import type { ClipboardItem, StorageData } from '../types';

const STORAGE_KEY = 'clipboard_history';
const DEFAULT_MAX_ITEMS = 100;
const SETTINGS_KEY = 'clipboard_settings';
const FREE_MAX_STARRED = 3;

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

export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const data = await getStorageData();
  data.items = data.items.filter((item: ClipboardItem) => item.id !== id);
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

export async function toggleStarredItem(id: string): Promise<{ success: boolean; isStarred: boolean; limitReached: boolean }> {
  const data = await getStorageData();
  const itemIndex = data.items.findIndex((item) => item.id === id);
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

  const starredCount = data.items.filter((entry) => entry.isStarred).length;
  if (starredCount >= FREE_MAX_STARRED) {
    return { success: false, isStarred: false, limitReached: true };
  }

  item.isStarred = true;
  data.items.splice(itemIndex, 1);
  data.items.unshift(item);
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
  return { success: true, isStarred: true, limitReached: false };
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}
