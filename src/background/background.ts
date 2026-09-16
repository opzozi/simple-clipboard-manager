import type { ClipboardItem, StorageData } from '../types';

const STORAGE_KEY = 'clipboard_history';
const DEFAULT_MAX_ITEMS = 500;
const MAX_ITEM_LENGTH = 50000;
const MIGRATION_VERSION_KEY = 'migration_version';
const CURRENT_MIGRATION_VERSION = 2;

function truncateItemText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_ITEM_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_ITEM_LENGTH);
}

async function saveClipboardItem(text: string): Promise<{ saved: boolean; isDuplicate: boolean }> {
  if (!text || text.trim().length === 0) {
    return { saved: false, isDuplicate: false };
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  if (!data.maxItems || data.maxItems < DEFAULT_MAX_ITEMS) {
    data.maxItems = DEFAULT_MAX_ITEMS;
  }

  const trimmedText = truncateItemText(text);
  const now = Date.now();
  const existingIndex = data.items.findIndex((item) => item.text === trimmedText);

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

  const starredItems = data.items.filter((item) => item.isStarred);
  const nonStarredItems = data.items.filter((item) => !item.isStarred);

  if (nonStarredItems.length > data.maxItems) {
    nonStarredItems.splice(data.maxItems);
  }

  data.items = [...starredItems, ...nonStarredItems];
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
  return { saved: true, isDuplicate: false };
}

function notifyTab(tabId: number | undefined, messageType: string) {
  if (!tabId) {
    return;
  }
  chrome.tabs.sendMessage(tabId, { type: messageType }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CLIPBOARD' && typeof message.text === 'string') {
    saveClipboardItem(message.text)
      .then((result) => {
        if (result.saved || result.isDuplicate) {
          notifyTab(sender.tab?.id, result.isDuplicate ? 'CLIPBOARD_UPDATED' : 'CLIPBOARD_SAVED');
        }
        sendResponse({ success: result.saved, isDuplicate: result.isDuplicate });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  return false;
});

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: 'save-selection',
        title: 'Save to Clipboard Manager',
        contexts: ['selection']
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });
}

async function runMigrations() {
  try {
    const migrationData = await chrome.storage.local.get(MIGRATION_VERSION_KEY);
    let currentVersion = migrationData[MIGRATION_VERSION_KEY] || 0;
    const storageData = await chrome.storage.local.get(STORAGE_KEY);
    const data = storageData[STORAGE_KEY];

    if (currentVersion < 1) {
      if (data && data.maxItems && data.maxItems < 100) {
        data.maxItems = 100;
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
      }
      currentVersion = 1;
    }

    if (currentVersion < 2) {
      if (data) {
        data.maxItems = DEFAULT_MAX_ITEMS;
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
      }
      currentVersion = 2;
    }

    await chrome.storage.local.set({ [MIGRATION_VERSION_KEY]: CURRENT_MIGRATION_VERSION });
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  runMigrations();
});

runMigrations();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-selection' && info.selectionText) {
    const result = await saveClipboardItem(info.selectionText);
    if (result.saved || result.isDuplicate) {
      notifyTab(tab?.id, result.isDuplicate ? 'CLIPBOARD_UPDATED' : 'CLIPBOARD_SAVED');
    }
  }
});
