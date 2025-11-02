import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnoozePreset } from '../presets';
import type { SnoozrSettings } from '../settings';

import {
  buildPresetTitle,
  calculatePresetWakeTime,
  DEFAULT_SNOOZE_PRESETS,
  getSnoozePresets,
  setSnoozePresets,
} from '../presets';

// Minimal chrome mock for storage.sync
global.chrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
} as unknown as typeof chrome;

describe('presets utils', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.sync.get).mockReset();
    vi.mocked(chrome.storage.sync.set).mockReset();
  });

  const baseSettings: SnoozrSettings = {
    startOfDay: '10:00',
    endOfDay: '20:00',
    startOfWeek: 1,
    startOfWeekend: 6,
    openInBg: false,
  };

  it('buildPresetTitle substitutes placeholders from settings and preset', () => {
    const later = DEFAULT_SNOOZE_PRESETS.find((p) => p.id === 'later_today')!;
    const custom: SnoozePreset = {
      ...later,
      relative: { hours: 3 },
    };
    const title = buildPresetTitle(custom, baseSettings);
    expect(title).toBe('Later (in 3h)');
  });

  it('buildPresetTitle shows "Tomorrow Night" when "Tonight" schedules for tomorrow', () => {
    const now = new Date(2025, 6, 12, 21, 0, 0, 0).getTime(); // Saturday 21:00 local
    const tonightPreset = DEFAULT_SNOOZE_PRESETS.find(
      (p) => p.id === 'tonight'
    )!;
    const settings: SnoozrSettings = {
      ...baseSettings,
      endOfDay: '20:00', // Already passed
    };
    const title = buildPresetTitle(tonightPreset, settings, now);
    expect(title).toBe('Tomorrow Night (at 20:00)');
  });

  it('buildPresetTitle shows "Next Weekend" when "This Weekend" schedules for next weekend', () => {
    const now = new Date(2025, 6, 12, 10, 16, 0, 0).getTime(); // Saturday 10:16 local
    const weekendPreset = DEFAULT_SNOOZE_PRESETS.find(
      (p) => p.id === 'weekend'
    )!;
    const settings: SnoozrSettings = {
      ...baseSettings,
      startOfDay: '09:08',
      startOfWeekend: 6, // Saturday
    };
    const title = buildPresetTitle(weekendPreset, settings, now);
    expect(title).toBe('Next Weekend (Saturday, 09:08)');
  });

  it('buildPresetTitle shows "This Weekend" when scheduling for current weekend', () => {
    const now = new Date(2025, 6, 10, 10, 0, 0, 0).getTime(); // Thursday 10:00 local
    const weekendPreset = DEFAULT_SNOOZE_PRESETS.find(
      (p) => p.id === 'weekend'
    )!;
    const settings: SnoozrSettings = {
      ...baseSettings,
      startOfDay: '09:08',
      startOfWeekend: 6, // Saturday
    };
    const title = buildPresetTitle(weekendPreset, settings, now);
    expect(title).toBe('This Weekend (Saturday, 09:08)');
  });

  it('buildPresetTitle shows "Next Weekend" when currently on Sunday (part of weekend)', () => {
    const now = new Date(2025, 6, 13, 10, 0, 0, 0).getTime(); // Sunday 10:00 local
    const weekendPreset = DEFAULT_SNOOZE_PRESETS.find(
      (p) => p.id === 'weekend'
    )!;
    const settings: SnoozrSettings = {
      ...baseSettings,
      startOfDay: '09:08',
      startOfWeekend: 6, // Saturday
      startOfWeek: 1, // Monday
    };
    const title = buildPresetTitle(weekendPreset, settings, now);
    expect(title).toBe('Next Weekend (Saturday, 09:08)');
  });

  it('calculatePresetWakeTime handles relative hours and days', () => {
    const now = new Date('2025-01-01T00:00:00.000Z').getTime();
    const preset: SnoozePreset = {
      id: 'rel_1',
      titleTemplate: 'In {hours}h',
      kind: 'relative',
      relative: { hours: 2, days: 1 },
    };
    const ts = calculatePresetWakeTime(preset, baseSettings, now);
    // 1 day + 2 hours
    expect(ts - now).toBe(24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
  });

  it('calculatePresetWakeTime for tonight returns endOfDay today if in future, else tomorrow endOfDay', () => {
    // Use a fixed date to avoid timezone issues - July 12, 2025 21:00 local time
    const nowDate = new Date(2025, 6, 12, 21, 0, 0, 0); // July 12, 2025 21:00 local
    const now = nowDate.getTime();

    const tonight: SnoozePreset = {
      id: 'tonight',
      titleTemplate: 'Tonight',
      kind: 'rule',
      rule: 'tonight',
    };

    // If endOfDay is in the future today, schedule for today
    const s1: SnoozrSettings = { ...baseSettings, endOfDay: '22:00' };
    const t1 = calculatePresetWakeTime(tonight, s1, now);
    const expectedToday = new Date(2025, 6, 12, 22, 0, 0, 0).getTime();
    expect(t1).toBe(expectedToday);

    // If endOfDay has already passed, schedule for tomorrow at endOfDay
    const s2: SnoozrSettings = { ...baseSettings, endOfDay: '20:00' };
    const t2 = calculatePresetWakeTime(tonight, s2, now);
    const expectedTomorrow = new Date(2025, 6, 13, 20, 0, 0, 0).getTime();
    expect(t2).toBe(expectedTomorrow);
    expect(t2).toBeGreaterThan(now);
  });

  it('calculatePresetWakeTime correctly handles boundary cases for rule presets', () => {
    // Test "tonight" when endOfDay has passed - should schedule for tomorrow at endOfDay
    const saturdayEvening = new Date(2025, 6, 12, 21, 0, 0, 0).getTime(); // Saturday 21:00 local
    const tonightPreset: SnoozePreset = {
      id: 'tonight',
      titleTemplate: 'Tonight',
      kind: 'rule',
      rule: 'tonight',
    };
    const tonightSettings: SnoozrSettings = {
      ...baseSettings,
      endOfDay: '20:00', // Already passed
    };
    const tonightWake = calculatePresetWakeTime(
      tonightPreset,
      tonightSettings,
      saturdayEvening
    );
    const expectedTomorrowNight = new Date(2025, 6, 13, 20, 0, 0, 0).getTime();
    expect(tonightWake).toBe(expectedTomorrowNight);
    expect(tonightWake).toBeGreaterThan(saturdayEvening);

    // Test "weekend" when already in weekend and time has passed - should schedule for next weekend
    // Saturday July 12, 2025 at 10:16 local time (matching user's CEST scenario)
    const saturdayMorning = new Date(2025, 6, 12, 10, 16, 0, 0).getTime();
    const weekendPreset = DEFAULT_SNOOZE_PRESETS.find(
      (p) => p.id === 'weekend'
    );
    expect(weekendPreset).toBeDefined();
    const weekendSettings: SnoozrSettings = {
      ...baseSettings,
      startOfDay: '09:08',
      startOfWeekend: 6, // Saturday
    };
    const weekendWake = calculatePresetWakeTime(
      weekendPreset!,
      weekendSettings,
      saturdayMorning
    );
    // Should be next Saturday (July 19) at 09:08 local time
    const expectedNextWeekend = new Date(2025, 6, 19, 9, 8, 0, 0).getTime();
    expect(weekendWake).toBe(expectedNextWeekend);
    expect(weekendWake).toBeGreaterThan(saturdayMorning);
    expect(new Date(weekendWake).getDay()).toBe(6); // Saturday

    // Test "next_week" when already past start of week time - should schedule for next week
    const mondayAfternoon = new Date(2025, 6, 14, 14, 0, 0, 0).getTime(); // Monday 14:00 local
    const nextWeekPreset: SnoozePreset = {
      id: 'next_week',
      titleTemplate: 'Next Week',
      kind: 'rule',
      rule: 'next_week',
    };
    const nextWeekSettings: SnoozrSettings = {
      ...baseSettings,
      startOfDay: '09:00', // Already passed
      startOfWeek: 1, // Monday
    };
    const nextWeekWake = calculatePresetWakeTime(
      nextWeekPreset,
      nextWeekSettings,
      mondayAfternoon
    );
    // Should be next Monday (July 21) at 09:00 local time
    const expectedNextMonday = new Date(2025, 6, 21, 9, 0, 0, 0).getTime();
    expect(nextWeekWake).toBe(expectedNextMonday);
    expect(nextWeekWake).toBeGreaterThan(mondayAfternoon);
    expect(new Date(nextWeekWake).getDay()).toBe(1); // Monday

    // Test "tomorrow" - should always schedule for tomorrow at startOfDay
    const tomorrowPreset: SnoozePreset = {
      id: 'tomorrow',
      titleTemplate: 'Tomorrow',
      kind: 'rule',
      rule: 'tomorrow',
    };
    const tomorrowWake = calculatePresetWakeTime(
      tomorrowPreset,
      baseSettings,
      saturdayMorning
    );
    const expectedTomorrow = new Date(2025, 6, 13, 10, 0, 0, 0).getTime();
    expect(tomorrowWake).toBe(expectedTomorrow);
    expect(tomorrowWake).toBeGreaterThan(saturdayMorning);
  });

  it('getSnoozePresets returns defaults when storage empty', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation(
      (keys: unknown, cb: (res: Record<string, unknown>) => void) => {
        cb({});
      }
    );
    const presets = await getSnoozePresets();
    expect(presets.length).toBeGreaterThanOrEqual(
      DEFAULT_SNOOZE_PRESETS.length
    );
  });

  it('getSnoozePresets normalizes legacy later_today and title placeholders', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation(
      (keys: unknown, cb: (res: Record<string, unknown>) => void) => {
        cb({
          snoozePresets: [
            {
              id: 'later_today',
              titleTemplate: 'Later (in {laterHours}h)',
              kind: 'relative',
              relative: {},
              icon: 'clock',
            },
          ],
          settings: { laterHours: 3 },
        });
      }
    );
    const presets = await getSnoozePresets();
    const p = presets.find((x) => x.id === 'later_today')!;
    expect(p.relative?.hours).toBe(3);
    const title = buildPresetTitle(p, baseSettings);
    expect(title).toBe('Later (in 3h)');
  });

  it('setSnoozePresets persists the provided presets', async () => {
    vi.mocked(chrome.storage.sync.set).mockImplementation(
      (data: Record<string, unknown>, callback: () => void) => {
        callback();
      }
    );
    const sample: SnoozePreset[] = [
      {
        id: 'custom',
        titleTemplate: 'In {hours}h',
        kind: 'relative',
        relative: { hours: 5 },
        icon: 'clock',
      },
    ];
    await setSnoozePresets(sample);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { snoozePresets: sample },
      expect.any(Function)
    );
  });
});
