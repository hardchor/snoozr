import { describe, expect, it } from 'vitest';

import {
  formatDateInputYMD,
  formatTimeInputHM,
  nextDayForDatetimeLocal,
} from '../datetime';

describe('datetime utils', () => {
  describe('nextDayForDatetimeLocal', () => {
    it('returns local datetime string for next day at same time', () => {
      // Use a fixed timestamp: July 12, 2025 08:33:00 local time
      // This is timezone-agnostic - we test that the function preserves local time
      const nowMs = new Date(2025, 6, 12, 8, 33, 0, 0).getTime();
      const result = nextDayForDatetimeLocal(nowMs);

      // Calculate expected value using the same helpers
      const nextDay = new Date(nowMs + 24 * 60 * 60 * 1000);
      const expected = `${formatDateInputYMD(nextDay)}T${formatTimeInputHM(nextDay)}`;

      expect(result).toBe(expected);
      // Verify format: YYYY-MM-DDTHH:MM
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('uses current time when no argument provided', () => {
      const now = Date.now();
      const result = nextDayForDatetimeLocal();

      // Verify format: YYYY-MM-DDTHH:MM
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

      // Parse the result - datetime-local strings are interpreted as local time
      const parsed = new Date(result);

      // Verify it's approximately 24 hours from now
      // Note: We lose seconds/milliseconds precision in formatting, so allow up to 1 minute difference
      const expectedMs = now + 24 * 60 * 60 * 1000;
      const diff = Math.abs(parsed.getTime() - expectedMs);
      expect(diff).toBeLessThan(60 * 1000); // 1 minute tolerance
    });

    it('preserves local time instead of converting to UTC', () => {
      // Create a date at 08:33 local time (which would be 06:33 UTC in CEST)
      const localTime = new Date(2025, 6, 12, 8, 33, 0, 0);
      const nowMs = localTime.getTime();
      const result = nextDayForDatetimeLocal(nowMs);

      // Extract time from result
      const timePart = result.split('T')[1];
      const [hours, minutes] = timePart.split(':').map(Number);

      // Verify it shows 08:33 (local time), not 06:33 (UTC)
      expect(hours).toBe(8);
      expect(minutes).toBe(33);
    });
  });
});
