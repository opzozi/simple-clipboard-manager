export type ItemType = 'link' | 'color' | 'text';

export function detectItemType(text: string): ItemType {
  const trimmed = text.trim();
  
  if (/^https?:\/\/.+/.test(trimmed)) {
    return 'link';
  }
  
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return 'color';
  }
  
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/.test(trimmed)) {
    return 'color';
  }
  
  if (/^hsla?\(\s*\d+\s*,\s*\d+%/.test(trimmed)) {
    return 'color';
  }
  
  return 'text';
}

export function colorCodeToCssColor(colorCode: string): string {
  const trimmed = colorCode.trim();
  
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return trimmed;
  }
  
  if (/^rgba?\(/.test(trimmed)) {
    return trimmed;
  }
  
  if (/^hsla?\(/.test(trimmed)) {
    return trimmed;
  }
  
  return trimmed;
}
