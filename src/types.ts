export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  isStarred?: boolean;
}

export interface StorageData {
  items: ClipboardItem[];
  maxItems: number;
}
