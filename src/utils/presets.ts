import { isSameDate } from './datetime';
import { SnoozrSettings } from './settings';

export type SnoozePresetKind = 'relative' | 'rule';

export type SnoozeRule = 'tonight' | 'tomorrow' | 'weekend' | 'next_week';

export type SnoozeIconName =
  | 'clock'
  | 'moon'
  | 'sunrise'
  | 'volleyball'
  | 'briefcase'
  | 'alarm'
  | 'bell'
  | 'calendar'
  | 'hourglass'
  | 'coffee'
  | 'sun'
  | 'star'
  | 'flag'
  | 'bookmark';

export interface SnoozePreset {
  id: string;
  titleTemplate: string;
  kind: SnoozePresetKind;
  relative?: {
    hours?: number;
    days?: number;
  };
  rule?: SnoozeRule;
  icon?: SnoozeIconName;
}

export const DEFAULT_SNOOZE_PRESETS: SnoozePreset[] = [
  {
    id: 'later_today',
    titleTemplate: 'Later (in {hours}h)',
    kind: 'relative',
    relative: { hours: 1 },
    icon: 'clock',
  },
  {
    id: 'tonight',
    titleTemplate: 'Tonight (at {endOfDay})',
    kind: 'rule',
    rule: 'tonight',
    icon: 'moon',
  },
  {
    id: 'tomorrow',
    titleTemplate: 'Tomorrow ({startOfDay})',
    kind: 'rule',
    rule: 'tomorrow',
    icon: 'sunrise',
  },
  {
    id: 'weekend',
    titleTemplate: 'This Weekend ({startOfWeekendName}, {startOfDay})',
    kind: 'rule',
    rule: 'weekend',
    icon: 'volleyball',
  },
  {
    id: 'next_week',
    titleTemplate: 'Next Week ({startOfWeekName}, {startOfDay})',
    kind: 'rule',
    rule: 'next_week',
    icon: 'briefcase',
  },
];

export function calculatePresetWakeTime(
  preset: SnoozePreset,
  settings: SnoozrSettings,
  nowMs: number = Date.now()
): number {
  if (preset.kind === 'relative') {
    const hours = preset.relative?.hours ?? 0;
    const days = preset.relative?.days ?? 0;
    return nowMs + hours * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000;
  }

  // rule-based
  switch (preset.rule) {
    case 'tonight': {
      const today = new Date(nowMs);
      const [h, m] = settings.endOfDay.split(':').map(Number);
      today.setHours(h, m, 0, 0);
      if (today.getTime() < nowMs) {
        // endOfDay has passed, schedule for tomorrow at endOfDay
        const tomorrow = new Date(nowMs);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(h, m, 0, 0);
        return tomorrow.getTime();
      }
      return today.getTime();
    }
    case 'tomorrow': {
      const tomorrow = new Date(nowMs);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [h, m] = settings.startOfDay.split(':').map(Number);
      tomorrow.setHours(h, m, 0, 0);
      return tomorrow.getTime();
    }
    case 'weekend': {
      const today = new Date(nowMs);
      const currentDay = today.getDay();
      let daysUntil = settings.startOfWeekend - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      const targetDate = new Date(nowMs);
      targetDate.setDate(today.getDate() + daysUntil);
      const [h, m] = settings.startOfDay.split(':').map(Number);
      targetDate.setHours(h, m, 0, 0);
      // If the calculated time is still in the past, add another week
      if (targetDate.getTime() < nowMs) {
        targetDate.setDate(targetDate.getDate() + 7);
      }
      return targetDate.getTime();
    }
    case 'next_week': {
      const today = new Date(nowMs);
      const currentDay = today.getDay();
      let daysUntil = settings.startOfWeek - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const targetDate = new Date(nowMs);
      targetDate.setDate(today.getDate() + daysUntil);
      const [h, m] = settings.startOfDay.split(':').map(Number);
      targetDate.setHours(h, m, 0, 0);
      // If the calculated time is still in the past, add another week
      if (targetDate.getTime() < nowMs) {
        targetDate.setDate(targetDate.getDate() + 7);
      }
      return targetDate.getTime();
    }
    default:
      return nowMs;
  }
}

/**
 * Builds a human-readable title for a snooze preset by substituting placeholders
 * with actual values from settings.
 *
 * When `nowMs` is provided, the function dynamically adjusts titles based on actual
 * scheduling logic to ensure accuracy:
 * - 'Tonight' becomes 'Tomorrow Night' if the preset would schedule for tomorrow
 *   (e.g., when endOfDay has already passed)
 * - 'This Weekend' becomes 'Next Weekend' if we're currently in the weekend
 *   (since the preset will schedule for the next weekend occurrence)
 *
 * @param preset - The snooze preset to build a title for
 * @param settings - User settings containing day names, times, etc.
 * @param nowMs - Optional timestamp (milliseconds since epoch). When provided,
 *                enables dynamic title adjustment based on actual wake time calculation.
 *                When omitted, only performs placeholder substitution.
 * @returns The formatted title string with placeholders replaced and dynamic
 *          adjustments applied (if nowMs was provided)
 *
 * @example
 * // Without nowMs - static placeholder substitution
 * buildPresetTitle(preset, settings)
 * // Returns: "Tonight (at 20:00)"
 *
 * @example
 * // With nowMs - dynamic adjustment when endOfDay has passed
 * buildPresetTitle(preset, settings, Date.now())
 * // Returns: "Tomorrow Night (at 20:00)" if scheduling for tomorrow
 *
 * @example
 * // With nowMs - dynamic adjustment for weekend
 * buildPresetTitle(weekendPreset, settings, saturdayTimestamp)
 * // Returns: "Next Weekend (Saturday, 09:08)" if currently in weekend
 */
export function buildPresetTitle(
  preset: SnoozePreset,
  settings: SnoozrSettings,
  nowMs?: number
): string {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  // Calculate wake time if nowMs is provided and preset is rule-based
  let adjustedTemplate = preset.titleTemplate;
  if (nowMs !== undefined && preset.kind === 'rule') {
    const wakeTime = calculatePresetWakeTime(preset, settings, nowMs);
    const wakeDate = new Date(wakeTime);
    const nowDate = new Date(nowMs);

    // Check if "tonight" actually schedules for tomorrow
    if (preset.rule === 'tonight') {
      const tomorrow = new Date(nowMs);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (isSameDate(wakeDate, tomorrow)) {
        adjustedTemplate = adjustedTemplate.replace(
          'Tonight',
          'Tomorrow Night'
        );
      }
    }

    // Check if "weekend" actually schedules for next weekend
    if (preset.rule === 'weekend') {
      const currentDay = nowDate.getDay();
      // Check if we're currently in the weekend
      // Weekend is the continuous block from startOfWeekend to the day before startOfWeek.
      // There are two cases to handle:
      // (1) Weekend doesn't wrap around week boundary (e.g., Saturday-Sunday, week starts Monday):
      //     startOfWeekend <= startOfWeek, so check if currentDay is in [startOfWeekend, startOfWeek)
      // (2) Weekend wraps around week boundary (e.g., Friday-Sunday, week starts Monday):
      //     startOfWeekend > startOfWeek, so check if currentDay >= startOfWeekend OR currentDay < startOfWeek
      const isCurrentlyInWeekend =
        settings.startOfWeekend <= settings.startOfWeek
          ? currentDay >= settings.startOfWeekend &&
            currentDay < settings.startOfWeek
          : currentDay >= settings.startOfWeekend ||
            currentDay < settings.startOfWeek;
      // If we're currently in the weekend, it will schedule for next weekend
      if (isCurrentlyInWeekend) {
        adjustedTemplate = adjustedTemplate.replace(
          'This Weekend',
          'Next Weekend'
        );
      }
    }
  }

  const replacements: Record<string, string | number> = {
    endOfDay: settings.endOfDay,
    startOfDay: settings.startOfDay,
    startOfWeekendName: dayNames[settings.startOfWeekend],
    startOfWeekName: dayNames[settings.startOfWeek],
    hours: preset.relative?.hours ?? '',
    days: preset.relative?.days ?? '',
  };
  return adjustedTemplate.replace(/\{(\w+)\}/g, (_, key) => {
    const v = replacements[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

function normalizePreset(
  preset: SnoozePreset,
  legacyLaterHours?: number
): SnoozePreset {
  const def = DEFAULT_SNOOZE_PRESETS.find((d) => d.id === preset.id);
  const base: SnoozePreset = {
    id: preset.id ?? def?.id ?? `custom_${Date.now()}`,
    titleTemplate: preset.titleTemplate ?? def?.titleTemplate ?? 'Preset',
    kind: preset.kind ?? def?.kind ?? 'relative',
    icon: preset.icon ?? def?.icon,
  } as SnoozePreset;

  // Migrate legacy placeholder {laterHours} -> {hours}
  if (base.titleTemplate && base.titleTemplate.includes('{laterHours}')) {
    base.titleTemplate = base.titleTemplate.replace(
      /\{laterHours\}/g,
      '{hours}'
    );
  }

  if ((preset.kind ?? def?.kind) === 'relative') {
    const rel = preset.relative ?? def?.relative ?? {};
    const { hours: relHours, days } = rel as { hours?: number; days?: number };
    let hours = relHours;
    // Migration: if a legacy preset used settings.laterHours or had no hours for later_today,
    // materialize hours from legacy settings value (default to 1 if absent)
    const hadLegacyFlag = Object.prototype.hasOwnProperty.call(
      rel,
      'useSettingsLaterHours'
    );
    if ((preset.id === 'later_today' && hours === undefined) || hadLegacyFlag) {
      hours = legacyLaterHours ?? 1;
    }
    return {
      ...base,
      kind: 'relative',
      relative: {
        hours,
        days,
      },
    };
  }

  return {
    ...base,
    kind: 'rule',
    rule: preset.rule ?? def?.rule ?? 'tomorrow',
  };
}

function normalizeSnoozePresets(
  presets: SnoozePreset[],
  legacyLaterHours?: number
): SnoozePreset[] {
  const merged: SnoozePreset[] = presets.map((p) =>
    normalizePreset(p, legacyLaterHours)
  );
  // Do not auto-append missing defaults: respect user removals
  // If storage is empty/undefined we already fall back to DEFAULT_SNOOZE_PRESETS in getSnoozePresets

  return merged;
}

export async function getSnoozePresets(): Promise<SnoozePreset[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['snoozePresets', 'settings'], (result) => {
      const stored = (result.snoozePresets ??
        DEFAULT_SNOOZE_PRESETS) as SnoozePreset[];
      const legacyLaterHours = Number(result.settings?.laterHours);
      resolve(
        normalizeSnoozePresets(
          stored,
          Number.isNaN(legacyLaterHours) ? undefined : legacyLaterHours
        )
      );
    });
  });
}

export async function setSnoozePresets(presets: SnoozePreset[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ snoozePresets: presets }, () => resolve());
  });
}

export async function resetSnoozePresets(): Promise<void> {
  return setSnoozePresets(DEFAULT_SNOOZE_PRESETS);
}
