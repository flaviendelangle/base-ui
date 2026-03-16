import { expect } from 'vitest';
import { TemporalAdapterDateFns } from '../../temporal-adapter-date-fns/TemporalAdapterDateFns';
import { getInitialReferenceDate } from './getInitialReferenceDate';

describe('getInitialReferenceDate', () => {
  const adapter = new TemporalAdapterDateFns();

  describe('when externalDate is provided and valid', () => {
    it('should return externalDate', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: adapter.date('2025-03-15', 'default'),
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-03-15');
    });

    it('should return externalDate even if externalReferenceDate is also provided', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: adapter.date('2025-03-15', 'default'),
        externalReferenceDate: adapter.date('2025-04-20', 'default'),
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-03-15');
    });

    it('should return externalDate even if it is outside min/max bounds', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: adapter.date('2025-01-15', 'default'),
        externalReferenceDate: null,
        validationProps: {
          min: adapter.date('2025-02-01', 'default'),
          max: adapter.date('2025-12-31', 'default'),
        },
      });

      // externalDate is returned as-is, validation bounds don't apply
      expect(result).toEqualDateTime('2025-01-15');
    });
  });

  describe('when externalReferenceDate is provided and valid (no externalDate)', () => {
    it('should return externalReferenceDate', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: adapter.date('2025-04-20', 'default'),
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-04-20');
    });

    it('should return externalReferenceDate even if it is outside min/max bounds', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: adapter.date('2025-01-15', 'default'),
        validationProps: {
          min: adapter.date('2025-02-01', 'default'),
          max: adapter.date('2025-12-31', 'default'),
        },
      });

      // externalReferenceDate is returned as-is, validation bounds don't apply
      expect(result).toEqualDateTime('2025-01-15');
    });
  });

  describe('when neither externalDate nor externalReferenceDate is provided', () => {
    it('should return the current date (start of day)', () => {
      vi.setSystemTime(new Date('2025-06-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-15');
      vi.useRealTimers();
    });

    it('should clamp to min if current date is before min', () => {
      vi.setSystemTime(new Date('2025-01-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-02-01', 'default') },
      });

      expect(result).toEqualDateTime('2025-02-01');
      vi.useRealTimers();
    });

    it('should clamp to max if current date is after max', () => {
      vi.setSystemTime(new Date('2025-12-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { max: adapter.date('2025-06-30', 'default') },
      });

      expect(result).toEqualDateTime('2025-06-30');
      vi.useRealTimers();
    });

    it('should return current date if it is within min/max bounds', () => {
      vi.setSystemTime(new Date('2025-06-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {
          min: adapter.date('2025-01-01', 'default'),
          max: adapter.date('2025-12-31', 'default'),
        },
      });

      expect(result).toEqualDateTime('2025-06-15');
      vi.useRealTimers();
    });
  });

  describe('timezone handling', () => {
    it('should set the timezone on the returned date', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'day',
        dateType: 'date',
        externalDate: adapter.date('2025-03-15', 'default'),
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(adapter.getTimezone(result)).toBe('UTC');
    });

    it('should set the timezone when using externalReferenceDate', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: adapter.date('2025-04-20', 'default'),
        validationProps: {},
      });

      expect(adapter.getTimezone(result)).toBe('UTC');
    });

    it('should set the timezone when falling back to current date', () => {
      vi.setSystemTime(new Date('2025-06-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'day',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(adapter.getTimezone(result)).toBe('UTC');
      vi.useRealTimers();
    });
  });

  describe('invalid dates handling', () => {
    it('should fall back to externalReferenceDate if externalDate is invalid', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: new Date('invalid'),
        externalReferenceDate: adapter.date('2025-04-20', 'default'),
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-04-20');
    });

    it('should fall back to current date if both externalDate and externalReferenceDate are invalid', () => {
      vi.setSystemTime(new Date('2025-06-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'day',
        dateType: 'date',
        externalDate: new Date('invalid'),
        externalReferenceDate: new Date('also-invalid'),
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-15');
      vi.useRealTimers();
    });
  });

  describe('granularity rounding', () => {
    it('should round to start of hour when granularity is "hours"', () => {
      vi.setSystemTime(new Date('2025-06-15T14:35:42.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'hours',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-15T14:00:00.000');
      vi.useRealTimers();
    });

    it('should round to start of minute when granularity is "minutes"', () => {
      vi.setSystemTime(new Date('2025-06-15T14:35:42.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'minutes',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-15T14:35:00.000');
      vi.useRealTimers();
    });

    it('should round to start of second when granularity is "seconds"', () => {
      vi.setSystemTime(new Date('2025-06-15T14:35:42.123Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'seconds',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-15T14:35:42.000');
      vi.useRealTimers();
    });

    it('should round to start of month when granularity is "month"', () => {
      vi.setSystemTime(new Date('2025-06-15T14:35:42.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'month',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-06-01');
      vi.useRealTimers();
    });

    it('should round to start of year when granularity is "year"', () => {
      vi.setSystemTime(new Date('2025-06-15T14:35:42.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'year',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-01-01');
      vi.useRealTimers();
    });

    it('should also round min when clamping', () => {
      vi.setSystemTime(new Date('2025-01-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'hours',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-02-01T10:45:00.000', 'default') },
      });

      expect(result).toEqualDateTime('2025-02-01T10:00:00.000');
      vi.useRealTimers();
    });

    it('should also round max when clamping', () => {
      vi.setSystemTime(new Date('2025-12-15T14:30:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'hours',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { max: adapter.date('2025-06-30T16:45:00.000', 'default') },
      });

      expect(result).toEqualDateTime('2025-06-30T16:00:00.000');
      vi.useRealTimers();
    });

    it('should not round externalDate regardless of granularity', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'hours',
        dateType: 'date',
        externalDate: adapter.date('2025-03-15T14:35:42.000', 'default'),
        externalReferenceDate: null,
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-03-15T14:35:42.000');
    });

    it('should not round externalReferenceDate regardless of granularity', () => {
      const result = getInitialReferenceDate({
        adapter,
        timezone: 'default',
        granularity: 'hours',
        dateType: 'date',
        externalDate: null,
        externalReferenceDate: adapter.date('2025-04-20T09:22:33.000', 'default'),
        validationProps: {},
      });

      expect(result).toEqualDateTime('2025-04-20T09:22:33.000');
    });
  });

  describe('dateType: time (compares time-of-day only)', () => {
    it('should clamp to min time when current time is before min time', () => {
      vi.setSystemTime(new Date('2025-06-15T08:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-01-01T10:00:00.000', 'UTC') },
      });

      // Time should be clamped to 10:00, date stays as now
      expect(adapter.getHours(result)).toBe(10);
      expect(adapter.getMinutes(result)).toBe(0);
      vi.useRealTimers();
    });

    it('should clamp to max time when current time is after max time', () => {
      vi.setSystemTime(new Date('2025-06-15T18:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { max: adapter.date('2025-01-01T16:00:00.000', 'UTC') },
      });

      // Time should be clamped to 16:00, date stays as now
      expect(adapter.getHours(result)).toBe(16);
      expect(adapter.getMinutes(result)).toBe(0);
      vi.useRealTimers();
    });

    it('should not clamp when current time is within bounds (ignoring date)', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: {
          min: adapter.date('2030-01-01T10:00:00.000', 'UTC'),
          max: adapter.date('2020-01-01T14:00:00.000', 'UTC'),
        },
      });

      // 12:00 is between 10:00 and 14:00 — date portions of min/max are irrelevant
      expect(adapter.getHours(result)).toBe(12);
      expect(adapter.getMinutes(result)).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('dateType: date-time (compares full timestamp)', () => {
    it('should not adjust when now is after min on a later day even if time-of-day is earlier', () => {
      // The bug case: min=Jan5@14:00, now=Jan6@10:00
      // now is AFTER min (Jan 6 > Jan 5), so no adjustment needed
      vi.setSystemTime(new Date('2025-01-06T10:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'date-time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-01-05T14:00:00.000', 'UTC') },
      });

      expect(result).toEqualDateTime('2025-01-06T10:00:00.000');
      vi.useRealTimers();
    });

    it('should not adjust when now is before max on an earlier day even if time-of-day is later', () => {
      // Symmetric case: max=Jan5@10:00, now=Jan4@14:00
      // now is BEFORE max (Jan 4 < Jan 5), so no adjustment needed
      vi.setSystemTime(new Date('2025-01-04T14:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'date-time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { max: adapter.date('2025-01-05T10:00:00.000', 'UTC') },
      });

      expect(result).toEqualDateTime('2025-01-04T14:00:00.000');
      vi.useRealTimers();
    });

    it('should clamp to min when now is fully before min', () => {
      vi.setSystemTime(new Date('2025-01-04T08:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'date-time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-01-05T14:00:00.000', 'UTC') },
      });

      expect(result).toEqualDateTime('2025-01-05T14:00:00.000');
      vi.useRealTimers();
    });

    it('should clamp to max when now is fully after max', () => {
      vi.setSystemTime(new Date('2025-01-06T18:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'date-time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { max: adapter.date('2025-01-05T10:00:00.000', 'UTC') },
      });

      expect(result).toEqualDateTime('2025-01-05T10:00:00.000');
      vi.useRealTimers();
    });

    it('should clamp to min when now is on the same day but before min time', () => {
      vi.setSystemTime(new Date('2025-01-05T08:00:00.000Z'));

      const result = getInitialReferenceDate({
        adapter,
        timezone: 'UTC',
        granularity: 'minutes',
        dateType: 'date-time',
        externalDate: null,
        externalReferenceDate: null,
        validationProps: { min: adapter.date('2025-01-05T14:00:00.000', 'UTC') },
      });

      expect(result).toEqualDateTime('2025-01-05T14:00:00.000');
      vi.useRealTimers();
    });
  });
});
