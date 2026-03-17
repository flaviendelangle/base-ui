import { createTemporalRenderer } from '#test-utils';
import { TemporalFieldStore } from './TemporalFieldStore';
import { dateFieldConfig } from '../root/dateFieldConfig';
import { timeFieldConfig } from '../../time-field/root/timeFieldConfig';
import { selectors } from './selectors';
import { createDefaultStoreParameters } from './TemporalFieldStore.test-utils';

describe('TemporalFieldStore - Value', () => {
  const { adapter } = createTemporalRenderer();
  const numericDateFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded}`;
  const time24Format = `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;

  const DEFAULT_PARAMETERS = createDefaultStoreParameters(adapter, numericDateFormat);

  describe('publish', () => {
    describe('uncontrolled mode', () => {
      it('should update store value when no controlled value prop is provided', () => {
        const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

        const newDate = adapter.date('2024-06-15', 'default');
        store.publish(newDate);

        expect(adapter.isValid(store.state.value)).toBe(true);
        expect(adapter.getMonth(store.state.value!)).toBe(5); // June (0-indexed)
        expect(adapter.getDate(store.state.value!)).toBe(15);
      });

      it('should update sections to match new value', () => {
        const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

        const newDate = adapter.date('2024-06-15', 'default');
        store.publish(newDate);

        const sections = selectors.sections(store.state);
        const dateParts = sections.filter((s) => s.type === 'datePart');
        expect(dateParts[0].value).toBe('06'); // month
        expect(dateParts[1].value).toBe('15'); // day
        expect(dateParts[2].value).toBe('2024'); // year
      });
    });

    describe('controlled mode', () => {
      it('should call onValueChange but not update store value when value prop is set', () => {
        const onValueChangeSpy = vi.fn();
        const controlledValue = adapter.date('2024-01-01', 'default');
        const store = new TemporalFieldStore(
          {
            ...DEFAULT_PARAMETERS,
            value: controlledValue,
            onValueChange: onValueChangeSpy,
          },
          dateFieldConfig,
        );

        const newDate = adapter.date('2024-06-15', 'default');
        store.publish(newDate);

        // onValueChange should be called
        expect(onValueChangeSpy.mock.calls.length).toBe(1);
        // Store value should NOT be updated (controlled)
        expect(adapter.getMonth(store.state.value!)).toBe(0); // January, unchanged
      });
    });

    describe('onValueChange callback', () => {
      it('should call onValueChange with the new value', () => {
        const onValueChangeSpy = vi.fn();
        const store = new TemporalFieldStore(
          {
            ...DEFAULT_PARAMETERS,
            onValueChange: onValueChangeSpy,
          },
          dateFieldConfig,
        );

        const newDate = adapter.date('2024-06-15', 'default');
        store.publish(newDate);

        expect(onValueChangeSpy.mock.calls.length).toBe(1);
        expect(adapter.isValid(onValueChangeSpy.mock.calls[0][0])).toBe(true);
      });

      it('should pass event details as second argument', () => {
        const onValueChangeSpy = vi.fn();
        const store = new TemporalFieldStore(
          {
            ...DEFAULT_PARAMETERS,
            onValueChange: onValueChangeSpy,
          },
          dateFieldConfig,
        );

        store.publish(adapter.date('2024-06-15', 'default'));

        expect(onValueChangeSpy.mock.calls[0][1]).not.toBe(undefined);
      });
    });
  });

  describe('updateFromString', () => {
    it('should parse a date string and update the value', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      store.updateFromString('06/15/2024');

      expect(adapter.isValid(store.state.value)).toBe(true);
      expect(adapter.getMonth(store.state.value!)).toBe(5);
      expect(adapter.getDate(store.state.value!)).toBe(15);
      expect(adapter.getYear(store.state.value!)).toBe(2024);
    });

    it('should parse a time string and update the value', () => {
      const store = new TemporalFieldStore(
        { ...DEFAULT_PARAMETERS, format: time24Format },
        timeFieldConfig,
      );

      store.updateFromString('14:30');

      expect(adapter.isValid(store.state.value)).toBe(true);
      expect(adapter.getHours(store.state.value!)).toBe(14);
      expect(adapter.getMinutes(store.state.value!)).toBe(30);
    });

    it('should call onValueChange when parsing a valid string', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      store.updateFromString('06/15/2024');

      expect(onValueChangeSpy.mock.calls.length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should set value to null when value is non-null', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-06-15', 'default'),
        },
        dateFieldConfig,
      );

      expect(store.state.value).not.toBe(null);
      store.clear();
      expect(store.state.value).toBe(null);
    });

    it('should call onValueChange with null when clearing', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-06-15', 'default'),
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      store.clear();
      expect(onValueChangeSpy.mock.calls.length).toBe(1);
      expect(onValueChangeSpy.mock.calls[0][0]).toBe(null);
    });

    it('should clear section values when value is already null (double-clear)', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      // First set some section values without creating a complete date
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '03',
        shouldGoToNextSection: false,
      });

      // Value is still null (not all sections filled)
      // Clear should empty the section values
      store.clear();

      const sections = selectors.sections(store.state);
      const dateParts = sections.filter((s) => s.type === 'datePart');
      dateParts.forEach((section) => {
        expect(section.value).toBe('');
      });
    });

    it('should work with TimeFieldStore', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          defaultValue: adapter.date('2024-06-15T14:30', 'default'),
        },
        timeFieldConfig,
      );

      expect(store.state.value).not.toBe(null);
      store.clear();
      expect(store.state.value).toBe(null);
    });
  });

  describe('deriveStateFromNewValue', () => {
    it('should rebuild sections from a valid new value', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-01', 'default'),
        },
        dateFieldConfig,
      );

      const newDate = adapter.date('2024-06-15', 'default');
      const derived = store.deriveStateFromNewValue(newDate);

      // Should have sections matching the new date
      const dateParts = derived.sections.filter((s) => s.type === 'datePart');
      expect(dateParts[0].value).toBe('06'); // month
      expect(dateParts[1].value).toBe('15'); // day
      expect(dateParts[2].value).toBe('2024'); // year
    });

    it('should update last valid value for a valid date', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-01', 'default'),
        },
        dateFieldConfig,
      );

      const newDate = adapter.date('2024-06-15', 'default');
      const derived = store.deriveStateFromNewValue(newDate);

      expect(adapter.isValid(derived.lastValidValue)).toBe(true);
    });

    it('should return sections with empty values for null value', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-01', 'default'),
        },
        dateFieldConfig,
      );

      const derived = store.deriveStateFromNewValue(null as any);

      const dateParts = derived.sections.filter((s) => s.type === 'datePart');
      dateParts.forEach((section) => {
        expect(section.value).toBe('');
      });
    });
  });

  describe('referenceValue staleness', () => {
    it('should pick up a new referenceDate when value is null', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      const referenceDate = adapter.date('2020-03-15', 'default');
      store.set('referenceDateProp', referenceDate);

      const refValue = selectors.referenceValue(store.state) as Date;
      expect(adapter.getYear(refValue)).toBe(2020);
      expect(adapter.getMonth(refValue)).toBe(2); // March (0-indexed)
      expect(adapter.getDate(refValue)).toBe(15);
    });

    it('should re-clamp referenceValue to new min when value and referenceDate are null', () => {
      // Without a referenceDate prop, the reference falls back to now(), which is clamped to min.
      // Set a far-future min so now() (2026-03-17 in tests) is before it and gets clamped.
      const futureMin = adapter.date('2030-06-01', 'default');
      const store = new TemporalFieldStore(
        { ...DEFAULT_PARAMETERS, min: futureMin },
        dateFieldConfig,
      );

      const refValue = selectors.referenceValue(store.state) as Date;
      expect(adapter.getYear(refValue)).toBe(2030);
      expect(adapter.getMonth(refValue)).toBe(5); // June (0-indexed)

      // Now change min to an even further future date
      const newMin = adapter.date('2035-01-01', 'default');
      store.set('min', newMin);

      const updatedRefValue = selectors.referenceValue(store.state) as Date;
      expect(adapter.getYear(updatedRefValue)).toBe(2035);
    });

    it('should apply updated timezone to referenceValue when value is valid', () => {
      const validDate = adapter.date('2024-06-15', 'default');
      const store = new TemporalFieldStore(
        { ...DEFAULT_PARAMETERS, defaultValue: validDate },
        dateFieldConfig,
      );

      store.set('timezoneProp', 'UTC');

      const refValue = selectors.referenceValue(store.state) as Date;
      expect(adapter.getTimezone(refValue)).toBe('UTC');
      expect(adapter.getYear(refValue)).toBe(2024);
    });

    it('should keep last valid value as reference after value is cleared, ignoring new referenceDate', () => {
      const validDate = adapter.date('2024-06-15', 'default');
      const store = new TemporalFieldStore(
        { ...DEFAULT_PARAMETERS, defaultValue: validDate },
        dateFieldConfig,
      );

      // Clear the value
      store.clear();

      // Change referenceDate after clearing
      store.set('referenceDateProp', adapter.date('2020-01-01', 'default'));

      const refValue = selectors.referenceValue(store.state) as Date;
      // Should still use the last valid value (2024-06-15), not the new referenceDate
      expect(adapter.getYear(refValue)).toBe(2024);
      expect(adapter.getMonth(refValue)).toBe(5); // June (0-indexed)
      expect(adapter.getDate(refValue)).toBe(15);
    });
  });
});
