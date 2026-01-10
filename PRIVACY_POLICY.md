# Privacy Policy for Simple Clipboard Manager

**Last Updated:** January 2026

## Overview

Simple Clipboard Manager is a privacy-focused Chrome extension that operates 100% offline. We do not collect, store, transmit, or share any user data with external servers or third parties.

## Data Collection

**We do not collect any user data.**

The extension operates entirely locally on your device:

- **No cloud sync**: All clipboard history is stored locally in your browser
- **No tracking**: No analytics, telemetry, or usage tracking
- **No external connections**: No API calls to external servers
- **No data transmission**: Your clipboard data never leaves your device

## Local Storage

The extension uses Chrome's local storage API to store:

- Clipboard history items (up to 100 items)
- User preferences (theme, auto-save settings, notification preferences)
- Pinned items

All data is stored locally in your browser and is never transmitted externally. You can clear all data at any time through the extension's settings panel.

## Permissions

The extension requires the following permissions:

- **storage**: To save clipboard history locally on your device
- **clipboardRead**: To read clipboard content during user copy interactions
- **clipboardWrite**: To copy saved items back to your clipboard when selected
- **contextMenus**: To add a "Save to Clipboard Manager" option to the right-click menu
- **tabs**: To send notification messages to content scripts for user feedback
- **Host permission (<all_urls>)**: To monitor clipboard copy events on all websites

These permissions are used solely for the extension's core functionality and are not used to collect or transmit any data.

## Data Security

- All data remains on your device
- No external servers involved
- No data sharing with third parties
- No cookies or tracking technologies
- Full user control - you can delete all data anytime

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date. Since the extension is open source, you can review the source code to verify our privacy practices.

## Contact

If you have questions about this privacy policy, please open an issue on GitHub: https://github.com/opzozi/simple-clipboard-manager

---

**Summary**: This extension is 100% offline, does not collect any user data, and all clipboard history is stored locally on your device only.
