import { createTemporalRenderer } from '#test-utils';
import { TemporalValue } from '../../types/temporal';
import { TemporalFieldStore } from './TemporalFieldStore';
import { createDefaultStoreParameters } from './TemporalFieldStore.test-utils';
import { dateFieldConfig } from '../root/dateFieldConfig';
import { selectors } from './selectors';

describe('TemporalFieldStore - Edge Dates', () => {
  const { adapter } = createTemporalRenderer();

  const numericDateFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded}`;
  const DEFAULT_PARAMETERS = createDefaultStoreParameters(adapter, numericDateFormat);

  function getDatePartValue(store: TemporalFieldStore<TemporalValue>, sectionIndex: number) {
    return selectors.datePart(store.state, sectionIndex)?.value ?? '';
  }

  // Helper to fill all sections of a date (MM/DD/YYYY format)
  function fillDate(
    store: TemporalFieldStore<TemporalValue>,
    month: string,
    day: string,
    year: string,
  ) {
    store.selectClosestDatePart(0);
    store.updateDatePart({
      sectionIndex: 0,
      newDatePartValue: month,
      shouldGoToNextSection: false,
    });
    store.selectClosestDatePart(2);
    store.updateDatePart({ sectionIndex: 2, newDatePartValue: day, shouldGoToNextSection: false });
    store.selectClosestDatePart(4);
    store.updateDatePart({ sectionIndex: 4, newDatePartValue: year, shouldGoToNextSection: false });
  }

  describe('February 29 - leap year rules', () => {
    it('should accept Feb 29 on a leap year (2024)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '29', '2024');

      const value = selectors.value(store.state);
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(1);
      expect(adapter.getDate(value!)).toBe(29);
      expect(adapter.getYear(value!)).toBe(2024);
    });

    it('should produce an invalid value for Feb 29 on a non-leap year (2023)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '29', '2023');

      const value = selectors.value(store.state);
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });

    it('should accept Feb 29 on year 2000 (divisible by 400 = leap year)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '29', '2000');

      const value = selectors.value(store.state);
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(1);
      expect(adapter.getDate(value!)).toBe(29);
      expect(adapter.getYear(value!)).toBe(2000);
    });

    it('should produce an invalid value for Feb 29 on year 1900 (divisible by 100 but not 400 = not a leap year)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '29', '1900');

      const value = selectors.value(store.state);
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });

    it('should produce an invalid value for Feb 29 on year 2100 (divisible by 100 but not 400 = not a leap year)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '29', '2100');

      const value = selectors.value(store.state);
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });

    it('should allow updating from non-leap year to leap year February 29th', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2023-02-28', 'default'),
        },
        dateFieldConfig,
      );

      // Update year to 2024 (leap year)
      store.selectClosestDatePart(4);
      store.updateDatePart({
        sectionIndex: 4,
        newDatePartValue: '2024',
        shouldGoToNextSection: false,
      });

      // Update day to 29
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '29',
        shouldGoToNextSection: false,
      });

      const value = selectors.value(store.state);
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getDate(value!)).toBe(29);
      expect(adapter.getYear(value!)).toBe(2024);
    });
  });

  describe('February 29 with year change via ArrowUp/Down', () => {
    it('should handle Feb 29 2024 → ArrowDown year to 2023', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-02-29', 'default'),
        },
        dateFieldConfig,
      );

      // Decrement year: 2024 → 2023
      store.selectClosestDatePart(4);
      store.adjustActiveDatePartValue('ArrowDown', 4);

      const value = selectors.value(store.state);
      // The store should handle this gracefully — either clamp to Feb 28 or mark invalid
      if (value != null && adapter.isValid(value)) {
        expect(adapter.getYear(value)).toBe(2023);
        // Day should be clamped to 28 since Feb 2023 has 28 days
        expect(adapter.getDate(value)).toBe(28);
      }
    });

    it('should handle Feb 29 2024 → ArrowUp year to 2025', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-02-29', 'default'),
        },
        dateFieldConfig,
      );

      // Increment year: 2024 → 2025
      store.selectClosestDatePart(4);
      store.adjustActiveDatePartValue('ArrowUp', 4);

      const value = selectors.value(store.state);
      // The store should handle this gracefully — either clamp to Feb 28 or mark invalid
      if (value != null && adapter.isValid(value)) {
        expect(adapter.getYear(value)).toBe(2025);
        expect(adapter.getDate(value)).toBe(28);
      }
    });
  });

  describe('Month/day boundary transitions', () => {
    it('should handle Jan 31 → change month to Feb', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          value: adapter.date('2024-01-31', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '02',
        shouldGoToNextSection: false,
      });

      const value = selectors.value(store.state);
      // Feb 31 is invalid — the store should keep the original value
      expect(value).not.toBe(null);
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(0); // January — kept original
    });

    it('should handle Feb 30 (always invalid)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '02', '30', '2024');

      const value = selectors.value(store.state);
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });

    it('should handle Apr 31 (April has 30 days)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);
      fillDate(store, '04', '31', '2024');

      const value = selectors.value(store.state);
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });
  });

  describe('Day wrapping per month length', () => {
    it('should wrap day from 31 to 1 on ArrowUp (month with 31 days)', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-31', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(2);
      store.adjustActiveDatePartValue('ArrowUp', 2);

      expect(getDatePartValue(store, 2)).toBe('01');
    });

    it('should wrap day from 1 to 31 on ArrowDown (month with 31 days)', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-01', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(2);
      store.adjustActiveDatePartValue('ArrowDown', 2);

      expect(getDatePartValue(store, 2)).toBe('31');
    });

    it('should increment day from 30 to 31 in Apr (wraps at token max 31, not month max 30)', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-04-30', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(2);
      store.adjustActiveDatePartValue('ArrowUp', 2);

      // Day wrapping uses the token boundary (1-31), not the month-aware max
      expect(getDatePartValue(store, 2)).toBe('31');
    });

    it('should increment day from 28 to 29 in Feb non-leap year (wraps at token max 31, not month max)', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2023-02-28', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(2);
      store.adjustActiveDatePartValue('ArrowUp', 2);

      // Day wrapping uses the token boundary (1-31), not the month-aware max
      expect(getDatePartValue(store, 2)).toBe('29');
    });

    it('should increment day from 29 to 30 in Feb leap year (wraps at token max 31, not month max)', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-02-29', 'default'),
        },
        dateFieldConfig,
      );

      store.selectClosestDatePart(2);
      store.adjustActiveDatePartValue('ArrowUp', 2);

      // Day wrapping uses the token boundary (1-31), not the month-aware max
      expect(getDatePartValue(store, 2)).toBe('30');
    });
  });

  describe('Paste edge cases', () => {
    it('should handle pasting an invalid string', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      expect(store.state.value).toBe(null);

      store.updateFromString('invalid');

      expect(store.state.value).toBe(null);
    });

    it('should handle pasting a partial date string', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      expect(store.state.value).toBe(null);

      store.updateFromString('03/15');

      const value = store.state.value;
      if (value != null) {
        expect(adapter.isValid(value)).toBe(false);
      }
    });
  });
});
