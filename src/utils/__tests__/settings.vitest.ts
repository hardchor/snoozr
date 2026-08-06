import type { SnoozrSettings } from '../settings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SETTINGS,
  getSnoozrSettings,
  setSnoozrSettings,
} from '../settings';

const mockStorageSyncGet = vi.fn();
const mockStorageSyncSet = vi.fn();

global.chrome = {
  storage: {
    sync: {
      get: mockStorageSyncGet,
      set: mockStorageSyncSet,
    },
  },
  runtime: {
    lastError: undefined,
  },
} as unknown as typeof chrome;

describe('Snoozr Settings', () => {
  beforeEach(() => {
    mockStorageSyncGet.mockReset();
    mockStorageSyncSet.mockReset();
  });

  describe('getSnoozrSettings', () => {
    it('returns defaults when empty', async () => {
      mockStorageSyncGet.mockImplementation(
        (
          _keys: string | string[],
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );
      const settings = await getSnoozrSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.openInBg).toBe(false);
    });

    it('returns stored settings', async () => {
      const stored: SnoozrSettings = {
        ...DEFAULT_SETTINGS,
        openInBg: true,
        startOfDay: '08:00',
      };
      mockStorageSyncGet.mockImplementation(
        (
          _keys: string | string[],
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({ settings: stored });
        }
      );
      const settings = await getSnoozrSettings();
      expect(settings).toEqual(stored);
    });
  });

  describe('setSnoozrSettings', () => {
    it('saves provided settings', async () => {
      const newSettings: SnoozrSettings = {
        ...DEFAULT_SETTINGS,
        openInBg: true,
        endOfDay: '20:00',
      } as SnoozrSettings;
      mockStorageSyncGet.mockImplementation(
        (
          _keys: string | string[],
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({ settings: {} });
        }
      );
      mockStorageSyncSet.mockImplementation(
        (_data: Record<string, unknown>, callback: () => void) => {
          callback();
        }
      );

      await setSnoozrSettings(newSettings);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        { settings: newSettings },
        expect.any(Function)
      );
    });
  });
});
