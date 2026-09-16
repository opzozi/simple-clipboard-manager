# Chrome Web Store listing (1.1.1)

Paste these into the developer dashboard when you publish 1.1.1. Replace the old “100 items / 3 pins” copy. Take new screenshots with dummy data (a hex color, a URL, a note like “temp login code”), not real clipboard contents.

## Short description

132 characters max. Current draft: 96 characters.

```
Private offline clipboard history. Notes, search, 15 pins. No cloud, no tracking. Open source.
```

## Detailed description

```
Simple Clipboard Manager keeps a history of what you copy, on this computer only. No account, no cloud, no analytics.

HOW IT WORKS

1. Copy with Ctrl+C, or right-click selected text and choose “Save to Clipboard Manager”.
2. Open the popup from the toolbar, or press Ctrl+Shift+Y (not Alt+Shift+V: Windows uses Alt+Shift to change keyboard layout).
3. Click any item to copy it back. Add a note so a random code still makes sense next week. Pin up to 15 items so they never get auto-deleted.

Password fields are skipped by default. You can ignore whole sites in Settings.

FEATURES

• Last 500 copies (oldest unpinned items drop off)
• Notes on items — searchable, kept if you copy the same text again
• Pin 15 items to the top
• Search across text and notes
• Link detection with “open in new tab”
• Color detection for hex, RGB, and HSL with a preview swatch
• Dark and light theme
• Open with Ctrl+Shift+Y (change in chrome://extensions/shortcuts)
• Keyboard: arrows, Enter, Escape
• Optional ignored-site list

PRIVACY

Everything is stored in Chrome’s local storage. The source is public:

https://github.com/opzozi/simple-clipboard-manager

Privacy policy:

https://github.com/opzozi/simple-clipboard-manager/blob/main/PRIVACY_POLICY.md

Permissions are used only to save copies you make, copy items back, show a context menu, and detect copy events on pages. Nothing is sent to a server.
```

## Manifest description

Keep in sync with `manifest.json` (also used as a short blurb):

```
Private offline clipboard history. Notes, search, pins, keyboard shortcut. No tracking, no cloud. Open source.
```
