# Simple Clipboard Manager

Offline clipboard history for Chrome. Everything stays on your device: no account, no cloud, no tracking.

## Features

- Saves what you copy (Ctrl+C) and selected text from the right-click menu
- 500 items; oldest unpinned items drop off first
- Notes on any item (searchable; kept when you copy the same text again)
- Pin up to 15 items so they stay at the top
- Search, link/color detection, dark and light theme
- Alt+Shift+V opens the popup (change it in `chrome://extensions/shortcuts`)
- Skips password fields; optional ignored-site list

## Development

Node.js 18+.

```bash
npm install
npm run build
```

Load unpacked from the `dist` folder in `chrome://extensions/` (developer mode on). `npm run dev` rebuilds on change.

## Privacy

All data is stored in `chrome.storage.local`. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Planned Pro (local only)

No cloud. License would unlock a text expander, encrypted backup, image history, more pins, and a floating window.

## Links

- Website: https://scm.opzozidev.com
- Chrome Web Store / GitHub: https://github.com/opzozi/simple-clipboard-manager
- Donate: https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG

## License

MIT
