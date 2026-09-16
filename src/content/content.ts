let lastToastTime = 0;

type ContentSettings = {
  autoSave: boolean;
  showToasts: boolean;
  skipPasswords: boolean;
  excludedHosts: string;
};

const DEFAULT_CONTENT_SETTINGS: ContentSettings = {
  autoSave: true,
  showToasts: true,
  skipPasswords: true,
  excludedHosts: '',
};

async function getSettings(): Promise<ContentSettings> {
  try {
    const result = await chrome.storage.local.get('clipboard_settings');
    return { ...DEFAULT_CONTENT_SETTINGS, ...(result.clipboard_settings || {}) };
  } catch {
    return { ...DEFAULT_CONTENT_SETTINGS };
  }
}

function ensureToastStyles() {
  if (document.getElementById('clipboard-manager-toast-styles') || !document.head) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'clipboard-manager-toast-styles';
  style.textContent = `
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideOutDown {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(20px); }
    }
  `;
  document.head.appendChild(style);
}

async function showToast(message: string) {
  const settings = await getSettings();
  if (!settings.showToasts || !document.body) {
    return;
  }

  ensureToastStyles();
  document.getElementById('clipboard-manager-toast')?.remove();

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
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  icon.style.flexShrink = '0';

  const messageEl = document.createElement('span');
  messageEl.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(messageEl);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function isPasswordField(el: Element | null): boolean {
  if (!(el instanceof HTMLInputElement)) {
    return false;
  }
  const type = el.type.toLowerCase();
  const autocomplete = (el.autocomplete || '').toLowerCase();
  return type === 'password'
    || autocomplete === 'current-password'
    || autocomplete === 'new-password';
}

function isExcludedHost(hostname: string, excludedHosts: string): boolean {
  const host = hostname.toLowerCase();
  return excludedHosts
    .split(/[\n,]/)
    .map((entry) => entry.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0])
    .filter(Boolean)
    .some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
}

function getCopiedText(e: ClipboardEvent): string {
  const fromEvent = e.clipboardData?.getData('text/plain') || '';
  if (fromEvent.trim()) {
    return fromEvent;
  }

  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (end > start) {
      return el.value.slice(start, end);
    }
  }

  return window.getSelection()?.toString() || '';
}

function maybeShowToast(message: string) {
  const now = Date.now();
  if (now - lastToastTime > 500) {
    showToast(message);
    lastToastTime = now;
  }
}

document.addEventListener('copy', (e) => {
  const fromPassword = isPasswordField(document.activeElement);
  const immediateText = getCopiedText(e);

  setTimeout(async () => {
    if (!isExtensionContextValid()) {
      return;
    }

    const settings = await getSettings();
    if (!settings.autoSave) {
      return;
    }
    if (settings.skipPasswords && fromPassword) {
      return;
    }
    if (isExcludedHost(window.location.hostname, settings.excludedHosts)) {
      return;
    }

    let text = immediateText;
    if (!text.trim()) {
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return;
      }
    }

    if (!text.trim()) {
      return;
    }

    chrome.runtime.sendMessage({ type: 'SAVE_CLIPBOARD', text }, () => {
      void chrome.runtime.lastError;
    });
  }, 100);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionContextValid() || !sender) {
    return false;
  }

  if (message.type === 'CLIPBOARD_SAVED') {
    maybeShowToast('Added to clipboard history');
    sendResponse({ success: true });
  } else if (message.type === 'CLIPBOARD_UPDATED') {
    maybeShowToast('Already in history');
    sendResponse({ success: true });
  }
  return true;
});
