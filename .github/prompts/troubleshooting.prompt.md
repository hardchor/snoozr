# Snoozr Troubleshooting Guide

Your goal is to diagnose and resolve issues with the Snoozr Chrome Extension.

## Issue Information

Please provide the following if not already specified:

- Description of the issue
- Where the issue occurs (popup, background, content script, etc.)
- Any error messages received
- Steps to reproduce

## Common Issues and Solutions

### Message Passing Problems

If experiencing issues with communication between extension contexts:

1. Check that message types match between sender and receiver
2. Verify the correct use of `chrome.runtime.sendMessage` vs `chrome.tabs.sendMessage`
3. Ensure background service worker is active when needed
4. Check for listener registration in the appropriate context

### Storage API Issues

For problems with data persistence:

1. Verify storage permission is included in the manifest
2. Check for storage quota limitations
3. Ensure proper error handling for storage operations
4. Validate data structure consistency

### UI Rendering Problems

For UI-related issues:

1. Check React component lifecycle and hook dependencies
2. Inspect theme implementation for dark/light mode issues
3. Verify Tailwind CSS classes are applied correctly
4. Look for missing DaisyUI component properties

### Extension Permissions

For permission-related issues:

1. Verify all required permissions in manifest.json
2. Check for runtime permission requests when needed
3. Ensure host permissions match the usage requirements
4. Look for permission-related errors in the console

## Debugging Approaches

1. Use `console.log` strategically in different contexts
2. Check Chrome's extension management page for errors
3. Examine the background service worker in Chrome's task manager
4. Use Chrome DevTools to inspect popup and options pages
5. Verify manifest.json configuration is correct for Manifest V3
