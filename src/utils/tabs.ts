/**
 * Gets the current tab to snooze, either from the tabId query parameter
 * or from the last focused window.
 *
 * @returns The active tab, or null if no tab could be found
 */
// eslint-disable-next-line import/prefer-default-export
export async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
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
