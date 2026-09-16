# Simple Clipboard Manager

A privacy-focused clipboard manager Chrome extension that works completely offline. Saves your clipboard history locally - no cloud, no tracking, fully private.

## Features

**Clipboard Management**
- Automatically saves everything you copy (Ctrl+C)
- Keeps last 100 items (oldest items are removed when limit is reached)
- Duplicate detection - existing items move to top with updated timestamp
- Right-click context menu to save selected text
- Click any item to copy it back

**Organization**
- Pin up to 3 items to keep them at the top (pinned items never get deleted)
- Smart type detection with icons for links, color codes, and text
- Quick "Open in new tab" button for links
- Real-time search/filter within current items
- Sidebar navigation: Recent, Pinned, Settings

**Productivity**
- Full keyboard navigation (Arrow keys, Enter, Escape)
- Smooth scrolling to selected items
- Item counter display (e.g., "6/100 items")

**Customization**
- Dark theme (default) and Light theme
- Theme toggle in header
- Settings panel to toggle auto-save and notifications

**Privacy & Security**
- 100% offline - all data stored locally
- No cloud sync, no tracking, no analytics
- No external API calls

## Development

**Requirements:**
- Node.js 18 or higher
- npm or yarn

**Getting Started:**

```bash
npm install
npm run dev    # Development build with watch mode
npm run build  # Production build
```

**Loading the Extension:**

1. Run `npm run build` to build the extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder

## Project Structure

```
├── src/
│   ├── popup/          # React popup UI
│   ├── background/     # Service worker
│   ├── content/        # Content script
│   ├── utils/          # Storage utilities
│   └── styles/         # CSS/Tailwind
├── icons/              # Extension icons
├── LICENSE             # MIT License
├── PRIVACY_POLICY.md
├── manifest.json       # Chrome extension manifest
└── vite.config.ts      # Build configuration
```

## Technical Details

**Clipboard Monitoring:**
Browser security restrictions require clipboard access through user interactions. The extension uses:
- Content scripts to detect copy events (Ctrl+C) on web pages
- Context menu for right-click save functionality
- Clipboard can only be read during active user interactions

Uses Manifest V3 with minimal permissions for privacy.

**Notifications:**
- Blue toast (browser): Bottom-right notifications when items are saved
  - "Added to clipboard history" for new items
  - "Already in history" for duplicates (works with Ctrl+C and right-click)
- Green toast (popup): Shows "Copied to clipboard" when clicking items

**Duplicate Handling:**
When copying the same text, the item moves to top with updated timestamp. Debounce prevents saving duplicates within 1 second. Works with both Ctrl+C and context menu.

**Storage Limits:**
Maximum 100 items. When the limit is reached, the oldest unpinned item is removed. Each item is capped at 50,000 characters. The footer shows the current count (e.g., "6/100 items").

**Search:**
Real-time search appears below header when items exist. React state-based filtering with search icon and clear button. Footer updates to show filtered count (e.g., "3 of 100 items").

**Pinned Items:**
Free version allows up to 3 pinned items (always at top, never deleted). Separate "Pinned" tab in sidebar. Pinned items excluded from 100-item limit.

**Keyboard Shortcuts:**
- Arrow Up/Down: Navigate items
- Enter: Copy selected item
- Escape: Clear selection (or clear search if search is focused)
- Smooth scrolling to selected items

**Type Detection:**
- Links: Detects URLs (http/https) with link icon
- Colors: Detects hex (#RGB, #RRGGBB, #RRGGBBAA), RGB/RGBA, HSL/HSLA with color preview
- Text: Default text icon
- Quick action button appears for links to open in new tab

**Themes:**
Dark theme is default. Light theme available. Toggle via sun/moon icon in header. All UI elements adapt to selected theme.

**Settings:**
Toggle auto-save and toast notifications. One-click clear all data with confirmation. Accessible via sidebar gear icon.

## Planned PRO Features

- Encrypted export/import
- Full history search (beyond 100 items)
- Categories/Tagging system
- Unlimited pinned items (free version: 3 pins)

## Links

- **Website**: https://scm.opzozidev.com
- **GitHub**: https://github.com/opzozi/simple-clipboard-manager
- **Developer**: https://opzozidev.com

## Support

Free and open source. If you find it useful, consider supporting development:

- Donate: https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG
- Star on GitHub: https://github.com/opzozi/simple-clipboard-manager

## License

MIT License

Source code, contributions, and issue reports: [GitHub](https://github.com/opzozi/simple-clipboard-manager)
