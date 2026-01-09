// Background Service Worker
const STORAGE_KEY = 'clipboard_history';
const DEFAULT_MAX_ITEMS = 100;
const MIGRATION_VERSION_KEY = 'migration_version';
const CURRENT_MIGRATION_VERSION = 1; // Increment when adding new migrations

async function saveClipboardItem(text: string): Promise<{ saved: boolean; isDuplicate: boolean }> {
  if (!text || text.trim().length === 0) {
    return { saved: false, isDuplicate: false };
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data = result[STORAGE_KEY] || { items: [], maxItems: DEFAULT_MAX_ITEMS };
  
  const trimmedText = text.trim();
  const now = Date.now();
  
  const existingIndex = data.items.findIndex(item => item.text === trimmedText);
  
  if (existingIndex !== -1) {
    const existingItem = data.items[existingIndex];
    
    if (existingIndex === 0 && (now - existingItem.timestamp) < 1000) {
      notifyContentScripts('CLIPBOARD_UPDATED');
      return { saved: false, isDuplicate: true };
    }
    
    data.items.splice(existingIndex, 1);
    existingItem.timestamp = now;
    data.items.unshift(existingItem);
    
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    notifyContentScripts('CLIPBOARD_UPDATED');
    
    return { saved: true, isDuplicate: true };
  }
  const newItem = {
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
  notifyContentScripts('CLIPBOARD_SAVED');
  
  return { saved: true, isDuplicate: false };
}

function notifyContentScripts(messageType: string) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        return;
      }
      tabs.forEach((tab) => {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('vivaldi://')) {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id!, {
              type: messageType
            }).catch(() => {});
          }, 50);
        }
      });
    });
  } catch (error) {
    console.error('Error notifying content scripts:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CLIPBOARD') {
    const text = message.text;
    if (text && typeof text === 'string') {
      saveClipboardItem(text).then((result) => {
        sendResponse({ success: result.saved, isDuplicate: result.isDuplicate });
      }).catch((error) => {
        console.error('Failed to save clipboard item:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Async response
    }
  }
  
  if (message.type === 'SHOW_TOAST') {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          console.debug('Error querying tabs:', chrome.runtime.lastError);
          return;
        }
        tabs.forEach((tab) => {
          if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('vivaldi://')) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'CLIPBOARD_SAVED'
            }).catch(() => {});
          }
        });
      });
    } catch (error) {
      console.debug('Error showing toast:', error);
    }
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// Context menu integration
function createContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'save-selection',
        title: 'Save to Clipboard Manager',
        contexts: ['selection']
      }, () => {});
    });
  } catch (error) {
    // Ignore
  }
}

async function runMigrations() {
  try {
    const migrationData = await chrome.storage.local.get(MIGRATION_VERSION_KEY);
    const currentVersion = migrationData[MIGRATION_VERSION_KEY] || 0;
    
    if (currentVersion < 1) {
      const storageData = await chrome.storage.local.get(STORAGE_KEY);
      const data = storageData[STORAGE_KEY];
      
      if (data && data.maxItems && data.maxItems < 100) {
        data.maxItems = 100;
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
      }
      
      await chrome.storage.local.set({ [MIGRATION_VERSION_KEY]: 1 });
    }
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  runMigrations();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
  runMigrations();
});

runMigrations();
createContextMenu();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-selection' && info.selectionText) {
    await saveClipboardItem(info.selectionText);
  }
});
