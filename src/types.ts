export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  isStarred?: boolean;
  note?: string;
}

export interface StorageData {
  items: ClipboardItem[];
  maxItems: number;
}
