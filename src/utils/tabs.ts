/**
 * Gets the current tab to snooze, checking multiple sources in order:
 * 1. Chrome storage (when opened via chrome.action.openPopup from context menu)
 * 2. URL query parameter (when opened via chrome.windows.create with URL)
 * 3. Last focused window (fallback)
 *
 * @returns The active tab, or null if no tab could be found
 */
// eslint-disable-next-line import/prefer-default-export
export async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    // First, check Chrome storage for contextMenuTabId
    // (set when opening via chrome.action.openPopup)
    const storageData = await chrome.storage.local.get('contextMenuTabId');
    if (storageData.contextMenuTabId !== undefined) {
      const storedTabId = Number(storageData.contextMenuTabId);
      if (!Number.isNaN(storedTabId)) {
        try {
          const tabById = await chrome.tabs.get(storedTabId);
          // Clear the stored tabId after reading it
          await chrome.storage.local.remove('contextMenuTabId');
          return tabById;
        } catch (e) {
          // Clear invalid stored tabId
          await chrome.storage.local.remove('contextMenuTabId');
          if (chrome.runtime.lastError) {
            /* acknowledged */
          }
        }
      } else {
        // Clear invalid stored tabId
        await chrome.storage.local.remove('contextMenuTabId');
      }
    }

    // Second, check URL query parameter (for windows created with URL)
    const params = new URLSearchParams(window.location.search);
    const tabIdParam = params.get('tabId');
    if (tabIdParam) {
      const id = Number(tabIdParam);
      if (!Number.isNaN(id)) {
        try {
          const tabById = await chrome.tabs.get(id);
          return tabById;
        } catch (e) {
          // Fall through to querying the last focused window
          if (chrome.runtime.lastError) {
            /* acknowledged */
          }
        }
      }
    }

    // Fallback: active tab in the last focused window
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    return tab || null;
  } catch (e) {
    if (chrome.runtime.lastError) {
      /* acknowledged */
    }
    return null;
  }
}
