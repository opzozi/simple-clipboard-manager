// Content script: Clipboard monitoring

let lastClipboardText = '';

async function getSettings(): Promise<{ autoSave: boolean; showToasts: boolean }> {
  try {
    const result = await chrome.storage.local.get('clipboard_settings');
    const settings = result.clipboard_settings || { autoSave: true, showToasts: true };
    return settings;
  } catch (error) {
    console.debug('Error getting settings:', error);
    return { autoSave: true, showToasts: true };
  }
}

async function showToast(message: string) {
  const settings = await getSettings();
  if (!settings.showToasts) {
    return;
  }

  const existingToast = document.getElementById('clipboard-manager-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  if (!document.body) {
    return;
  }
  const toast = document.createElement('div');
  toast.id = 'clipboard-manager-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3B82F6;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideInUp 0.3s ease-out;
    pointer-events: none;
  `;

  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  `;
  icon.style.cssText = 'flex-shrink: 0;';

  const messageEl = document.createElement('span');
  messageEl.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(messageEl);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 2500);
}

if (!document.getElementById('clipboard-manager-toast-styles')) {
  const style = document.createElement('style');
  style.id = 'clipboard-manager-toast-styles';
  style.textContent = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideOutDown {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(20px);
      }
    }
  `;
  document.head.appendChild(style);
}

function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && 
           typeof chrome.runtime !== 'undefined' && 
           typeof chrome.runtime.id !== 'undefined';
  } catch (error) {
    return false;
  }
}

document.addEventListener('copy', async (e) => {
  const settings = await getSettings();
  if (!settings.autoSave) {
    return;
  }

  setTimeout(async () => {
    if (!isExtensionContextValid()) {
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0 && text !== lastClipboardText) {
        if (!isExtensionContextValid()) {
          return;
        }

        chrome.runtime.sendMessage({
          type: 'SAVE_CLIPBOARD',
          text: text
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
              return;
            }
            return;
          }
          if (response && response.success) {
            const now = Date.now();
            if (now - lastToastTime > 500) {
              if (response.isDuplicate) {
                showToast('Already in history');
              } else {
                showToast('Added to clipboard history');
              }
              lastToastTime = now;
            }
          }
        });
        lastClipboardText = text;
      }
    } catch (error: any) {
      if (error?.message?.includes('Extension context invalidated')) {
        return;
      }
    }
  }, 100);
});

let lastToastTime = 0;
let lastToastText = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionContextValid()) {
    return false;
  }

  if (message.type === 'CLIPBOARD_SAVED') {
    const now = Date.now();
    if (now - lastToastTime > 500) {
      showToast('Added to clipboard history');
      lastToastTime = now;
    }
    sendResponse({ success: true });
  } else if (message.type === 'CLIPBOARD_UPDATED') {
    const now = Date.now();
    if (now - lastToastTime > 500) {
      showToast('Already in history');
      lastToastTime = now;
    }
    sendResponse({ success: true });
  }
  return true;
});
