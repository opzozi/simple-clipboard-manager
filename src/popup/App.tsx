import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getStorageData, deleteClipboardItem, copyToClipboard, clearClipboardHistory, toggleStarredItem, getSettings, saveSettings, updateItemNote, MAX_NOTE_LENGTH, type Settings } from '../utils/storage';
import { detectItemType, colorCodeToCssColor, type ItemType } from '../utils/itemType';
import type { ClipboardItem } from '../types';

type ActiveTab = 'recent' | 'pinned';

const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [maxItems, setMaxItems] = useState(500);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showToasts, setShowToasts] = useState(true);
  const [skipPasswords, setSkipPasswords] = useState(true);
  const [excludedHosts, setExcludedHosts] = useState('');
  const [popupShortcut, setPopupShortcut] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('recent');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const editingNoteIdRef = useRef<string | null>(null);
  const skipNoteSaveRef = useRef(false);

  const displayedItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = items.filter((item) =>
      item.text.toLowerCase().includes(query)
      || (item.note || '').toLowerCase().includes(query)
    );

    const starred = filtered.filter(item => item.isStarred).sort((a, b) => b.timestamp - a.timestamp);
    const recent = filtered.filter(item => !item.isStarred).sort((a, b) => b.timestamp - a.timestamp);

    if (activeTab === 'pinned') {
      return starred;
    }
    return recent;
  }, [items, searchQuery, activeTab]);

  const handleCopy = useCallback(async (item: ClipboardItem) => {
    await copyToClipboard(item.text);
    setCopiedId(item.id);
    
    if (showToasts) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2500);
    }
    
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToasts]);

  const loadItems = async () => {
    try {
      const storageData = await getStorageData();
      setItems(storageData.items);
      setMaxItems(storageData.maxItems);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      setAutoSave(settings.autoSave);
      setShowToasts(settings.showToasts);
      setSkipPasswords(settings.skipPasswords);
      setExcludedHosts(settings.excludedHosts || '');
      setTheme(settings.theme || 'dark');
      document.documentElement.classList.toggle('light-theme', settings.theme === 'light');
      document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = async (newSettings: Settings) => {
    await saveSettings(newSettings);
    setAutoSave(newSettings.autoSave);
    setShowToasts(newSettings.showToasts);
    setSkipPasswords(newSettings.skipPasswords);
    setExcludedHosts(newSettings.excludedHosts);
    setTheme(newSettings.theme || 'dark');
    document.documentElement.classList.toggle('light-theme', newSettings.theme === 'light');
    document.documentElement.classList.toggle('dark-theme', newSettings.theme === 'dark');
  };

  const persistSettings = (patch: Partial<Settings>) => {
    return handleSaveSettings({
      autoSave,
      showToasts,
      theme,
      skipPasswords,
      excludedHosts,
      ...patch,
    });
  };

  const handleToggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await persistSettings({ theme: newTheme });
  };

  const startEditNote = (item: ClipboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingNoteId && editingNoteId !== item.id) {
      updateItemNote(editingNoteId, noteDraft);
    }
    skipNoteSaveRef.current = false;
    setEditingNoteId(item.id);
    setNoteDraft(item.note || '');
    setTimeout(() => noteInputRef.current?.focus(), 0);
  };

  const saveNote = async () => {
    if (skipNoteSaveRef.current) {
      skipNoteSaveRef.current = false;
      return;
    }
    if (!editingNoteId) {
      return;
    }
    const id = editingNoteId;
    setEditingNoteId(null);
    await updateItemNote(id, noteDraft);
  };

  const cancelNote = () => {
    skipNoteSaveRef.current = true;
    setEditingNoteId(null);
    setNoteDraft('');
  };

  useEffect(() => {
    editingNoteIdRef.current = editingNoteId;
  }, [editingNoteId]);

  useEffect(() => {
    if (!chrome.commands?.getAll) {
      return;
    }
    chrome.commands.getAll((commands) => {
      const open = commands.find((command) => command.name === 'open-popup');
      setPopupShortcut(open?.shortcut || '');
    });
  }, [showSettings]);

  useEffect(() => {
    loadItems();
    loadSettings();

    const handleStorageChange = () => {
      if (editingNoteIdRef.current) {
        return;
      }
      loadItems();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape') {
          setSearchQuery('');
          setSelectedIndex(0);
          searchInputRef.current?.blur();
          e.preventDefault();
        }
        return;
      }

      if (document.activeElement === noteInputRef.current || editingNoteId) {
        return;
      }

      if (showConfirm || showProModal || showSettings) return;

      const filteredCount = displayedItems.length;
      if (filteredCount === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < filteredCount - 1 ? prev + 1 : 0;
          setTimeout(() => {
            itemRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : filteredCount - 1;
          setTimeout(() => {
            itemRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return next;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < filteredCount) {
        e.preventDefault();
        handleCopy(displayedItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [displayedItems, selectedIndex, showConfirm, showProModal, showSettings, handleCopy, editingNoteId]);

  useEffect(() => {
    const totalItems = displayedItems.length;
    if (totalItems > 0 && selectedIndex >= totalItems) {
      setSelectedIndex(0);
    } else if (totalItems > 0 && selectedIndex === -1) {
      setSelectedIndex(0);
    }
  }, [displayedItems.length, selectedIndex]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteClipboardItem(id);
  };

  const handleOpenLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chrome.tabs.create({ url: url });
  };

  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await toggleStarredItem(id);
    if (result.limitReached) {
      setShowProModal(true);
    }
  };

  const handleClear = async () => {
    setShowConfirm(true);
  };

  const confirmClear = async () => {
    await clearClipboardHistory();
    setShowConfirm(false);
  };

  const cancelClear = () => setShowConfirm(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days >= 7) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    }

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getItemIcon = (itemType: ItemType, itemText: string) => {
    switch (itemType) {
      case 'link':
        return (
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'color': {
        const cssColor = colorCodeToCssColor(itemText);
        return (
          <div 
            className={`w-4 h-4 rounded-full flex-shrink-0 border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-400'}`}
            style={{ backgroundColor: cssColor }}
            title={itemText}
          />
        );
      }
      case 'text':
      default:
        return (
          <svg className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex flex-col relative ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`} style={{ minHeight: '500px', maxHeight: '600px', minWidth: '464px', width: '464px' }}>
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Simple Clipboard Manager</h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Private & Offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTheme}
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'} p-1.5 rounded transition-colors`}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {items.length > 0 && (
              <button
                onClick={handleClear}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'} px-2 py-1 rounded transition-colors`}
                title="Clear all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-16 border-r flex flex-col items-center py-3 gap-2 ${theme === 'dark' ? 'bg-slate-950 border-gray-800' : 'bg-gray-100 border-gray-300'}`}>
          <button
            onClick={() => {
              setActiveTab('recent');
              setSelectedIndex(-1);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all relative group ${
              activeTab === 'recent'
                ? 'bg-blue-600 text-white'
                : theme === 'dark' 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Recent History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setActiveTab('pinned');
              setSelectedIndex(-1);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all relative group ${
              activeTab === 'pinned'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Pinned items"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <button
            onClick={() => setShowProModal(true)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all relative group ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Categories (PRO feature)"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <svg className="w-3 h-3 absolute bottom-1 right-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowSettings(true)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              showSettings
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {items.length > 0 && (
            <div className={`px-4 py-2 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  placeholder="Search text or notes..."
                  className={`w-full rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  autoFocus={false}
                />
                <svg 
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Loading...</div>
          </div>
        ) : items.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 px-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Your clipboard history will appear here</p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Copy something to get started!</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 px-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No items found</p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {activeTab === 'pinned' ? 'No pinned items yet' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {displayedItems.map((item, index) => {
              return (
                <div
                  key={item.id}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => {
                    if (editingNoteId === item.id) {
                      return;
                    }
                    setSelectedIndex(index);
                    handleCopy(item);
                  }}
                  className={`border rounded-lg p-3 cursor-pointer transition-all group ${
                    selectedIndex === index
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                        : 'bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                  } ${selectedIndex === index ? (theme === 'dark' ? 'bg-gray-750' : 'bg-blue-50') : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {getItemIcon(detectItemType(item.text), item.text)}
                        </div>
                        <p className={`text-sm break-words leading-relaxed flex-1 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                          {truncateText(item.text)}
                        </p>
                      </div>
                      {editingNoteId === item.id ? (
                        <input
                          ref={noteInputRef}
                          type="text"
                          value={noteDraft}
                          maxLength={MAX_NOTE_LENGTH}
                          placeholder="Note, e.g. temporary login code"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onBlur={saveNote}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveNote();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelNote();
                            }
                          }}
                          className={`mt-2 w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            theme === 'dark'
                              ? 'bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400'
                              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      ) : item.note ? (
                        <p className={`mt-1.5 text-xs italic break-words ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                          {item.note}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {formatTime(item.timestamp)}
                          </p>
                          {copiedId === item.id && (
                            <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {detectItemType(item.text) === 'link' && (
                            <button
                              onClick={(e) => handleOpenLink(item.text, e)}
                              className={`p-1 rounded transition-all ${theme === 'dark' ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'}`}
                              title="Open in new tab"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className={`p-1 rounded transition-all ${theme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'}`}
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
                      <button
                        onClick={(e) => startEditNote(item, e)}
                        className={`p-1.5 rounded transition-all ${
                          item.note
                            ? 'text-blue-400 hover:text-blue-300'
                            : theme === 'dark'
                              ? 'text-gray-500 hover:text-blue-400 opacity-60 hover:opacity-100'
                              : 'text-gray-400 hover:text-blue-600 opacity-60 hover:opacity-100'
                        }`}
                        title={item.note ? 'Edit note' : 'Add note'}
                      >
                        <svg className="w-4 h-4" fill={item.note ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleToggleStar(item.id, e)}
                        className={`p-1.5 rounded transition-all ${
                          item.isStarred
                            ? 'text-yellow-400 hover:text-yellow-300'
                            : theme === 'dark'
                              ? 'text-gray-500 hover:text-yellow-400 opacity-60 hover:opacity-100'
                              : 'text-gray-400 hover:text-yellow-500 opacity-60 hover:opacity-100'
                        }`}
                        title={item.isStarred ? 'Unpin' : 'Pin to top'}
                      >
                        <svg className="w-4 h-4" fill={item.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        </div>
      </div>

      <div className={`border-t px-4 py-2.5 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
            {items.length > 0 
              ? (searchQuery 
                  ? `${displayedItems.length} of ${items.length} items`
                  : `${items.length}/${maxItems} items`)
              : ''}
          </span>
          <div className="flex items-center gap-2.5">
            <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>v1.1.1</span>
            <a
              href="#"
              className={`transition-colors flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400 hover:text-pink-500' : 'text-gray-500 hover:text-pink-600'}`}
              onClick={(e) => {
                e.preventDefault();
                chrome.tabs.create({
                  url: 'https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG'
                });
              }}
              title="Support via PayPal"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Donate
            </a>
            <a
              href="#"
              className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
              onClick={(e) => {
                e.preventDefault();
                chrome.tabs.create({ url: 'https://scm.opzozidev.com' });
              }}
              title="Extension Website"
            >
              scm.opzozidev.com
            </a>
            <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>•</span>
            <a
              href="#"
              className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
              onClick={(e) => {
                e.preventDefault();
                chrome.tabs.create({ url: 'https://github.com/opzozi/simple-clipboard-manager' });
              }}
              title="GitHub Repository"
            >
              GitHub
            </a>
            <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>•</span>
            <a
              href="#"
              className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
              onClick={(e) => {
                e.preventDefault();
                chrome.tabs.create({ url: 'https://opzozidev.com' });
              }}
              title="Opzozi Dev"
            >
              opzozidev.com
            </a>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none">
          <div className="bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 min-w-[200px] animate-[slideDown_0.3s_ease-out] border border-green-500">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Copied to clipboard</span>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`border-2 rounded-lg shadow-2xl w-[320px] p-5 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-400 shadow-[0_20px_60px_rgba(0,0,0,0.3)]'}`}>
            <h2 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Clear all items?</h2>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              This will remove your entire clipboard history. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={cancelClear}
                className={`px-4 py-2 text-xs font-medium rounded transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`border-2 rounded-lg shadow-2xl w-[400px] max-h-[600px] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-400 shadow-[0_20px_60px_rgba(0,0,0,0.3)]'}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Auto-save</h3>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Automatically save clipboard items when copying</p>
                  </div>
                  <button
                    onClick={() => persistSettings({ autoSave: !autoSave })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSave ? 'bg-blue-600' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Toast Notifications</h3>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Show notifications when items are saved or copied</p>
                  </div>
                  <button
                    onClick={() => persistSettings({ showToasts: !showToasts })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showToasts ? 'bg-blue-600' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showToasts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Skip passwords</h3>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Do not save copies from password fields</p>
                  </div>
                  <button
                    onClick={() => persistSettings({ skipPasswords: !skipPasswords })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      skipPasswords ? 'bg-blue-600' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        skipPasswords ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Ignored sites</h3>
                <p className={`text-xs mt-0.5 mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>One domain per line. Copies on these sites are not saved.</p>
                <textarea
                  value={excludedHosts}
                  rows={3}
                  placeholder={'bank.example.com\nmail.google.com'}
                  onChange={(e) => setExcludedHosts(e.target.value)}
                  onBlur={() => persistSettings({ excludedHosts })}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div className="mb-6">
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Keyboard shortcut</h3>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {popupShortcut
                    ? `Current: ${popupShortcut}`
                    : 'Not assigned. Windows uses Alt+Shift to switch keyboard layout, so that combo is not used.'}
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Suggested: Ctrl+Shift+Y
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const url = /Vivaldi/i.test(navigator.userAgent)
                      ? 'vivaldi://extensions/shortcuts'
                      : 'chrome://extensions/shortcuts';
                    chrome.tabs.create({ url });
                  }}
                  className={`mt-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-100 bg-gray-700 hover:bg-gray-600'
                      : 'text-gray-800 bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Assign shortcut
                </button>
              </div>

              <div className={`border-t my-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`} />
              <div className="mb-6">
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Data</h3>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowConfirm(true);
                  }}
                  className={`w-full px-4 py-2 text-sm font-medium text-red-400 rounded transition-colors ${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Clear All Data
                </button>
              </div>

              <div className={`border-t my-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`} />

              <div>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>About</h3>
                <div className={`space-y-2 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>Version</span>
                    <span className={theme === 'dark' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>v1.1.1</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: 'https://scm.opzozidev.com' });
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      scm.opzozidev.com
                    </a>
                    <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>•</span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: 'https://github.com/opzozi/simple-clipboard-manager' });
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      GitHub
                    </a>
                    <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>•</span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: 'https://opzozidev.com' });
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      opzozidev.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`border-2 rounded-lg shadow-2xl w-[360px] p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-400 shadow-[0_20px_60px_rgba(0,0,0,0.3)]'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-base font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Unlock Unlimited Pins</h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Local Pro</p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              You've reached the free limit of <span className="font-semibold text-blue-400">15 pinned items</span>.
              A local Pro license is planned: expander, encrypted backup, more pins. No cloud.
            </p>
            <div className={`rounded-lg p-3 mb-4 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pro (local):</p>
              <ul className={`text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited pinned items
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Text expander / snippets
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Encrypted export/import
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Image history
                </li>
              </ul>
            </div>
            <p className={`text-xs text-center mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              For more details, visit our website
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowProModal(false)}
                className={`px-4 py-2 text-xs font-medium rounded transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowProModal(false);
                  chrome.tabs.create({ url: 'https://scm.opzozidev.com' });
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
