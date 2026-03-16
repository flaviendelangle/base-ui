import { createTemporalRenderer } from '#test-utils';
import { TemporalFieldStore } from './TemporalFieldStore';
import { dateFieldConfig } from '../root/dateFieldConfig';
import { timeFieldConfig } from '../../time-field/root/timeFieldConfig';
import { selectors } from './selectors';
import { createDefaultStoreParameters } from './TemporalFieldStore.test-utils';

describe('TemporalFieldStore - Field Integration', () => {
  const { adapter } = createTemporalRenderer();

  // Date formats
  const numericDateFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded}`;

  // Time formats
  const time24Format = `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;

  const DEFAULT_PARAMETERS = createDefaultStoreParameters(adapter, numericDateFormat);

  describe('fieldContext storage', () => {
    it('should store fieldContext in state when provided in parameters', () => {
      const mockFieldContext = {
        name: 'testField',
        state: { disabled: false },
        invalid: false,
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(store.state.fieldContext).toBe(mockFieldContext);
    });

    it('should store null when fieldContext is not provided', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      expect(store.state.fieldContext).toBe(null);
    });

    it('should update fieldContext when parameters change', () => {
      const initialFieldContext = {
        name: 'field1',
        state: { disabled: false },
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          fieldContext: initialFieldContext,
        },
        dateFieldConfig,
      );

      expect(store.state.fieldContext).toBe(initialFieldContext);

      const newFieldContext = {
        name: 'field2',
        state: { disabled: true },
      } as any;

      store.set('fieldContext', newFieldContext);

      expect(store.state.fieldContext).toBe(newFieldContext);
    });
  });

  describe('disabled selector', () => {
    it('should return disabledProp when fieldContext is null', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          disabled: true,
        },
        dateFieldConfig,
      );

      expect(selectors.disabled(store.state)).toBe(true);
    });

    it('should return true when fieldContext.state.disabled is true and disabledProp is false', () => {
      const mockFieldContext = {
        state: { disabled: true },
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          disabled: false,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(selectors.disabled(store.state)).toBe(true);
    });

    it('should return true when disabledProp is true and fieldContext.state.disabled is false', () => {
      const mockFieldContext = {
        state: { disabled: false },
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          disabled: true,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(selectors.disabled(store.state)).toBe(true);
    });

    it('should return false when both disabledProp and fieldContext.state.disabled are false', () => {
      const mockFieldContext = {
        state: { disabled: false },
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          disabled: false,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(selectors.disabled(store.state)).toBe(false);
    });
  });

  describe('name selector', () => {
    it('should return nameProp when fieldContext is null', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          name: 'localName',
        },
        dateFieldConfig,
      );

      expect(selectors.name(store.state)).toBe('localName');
    });

    it('should prefer fieldContext.name over nameProp', () => {
      const mockFieldContext = {
        name: 'fieldName',
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          name: 'localName',
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(selectors.name(store.state)).toBe('fieldName');
    });

    it('should fall back to nameProp when fieldContext.name is undefined', () => {
      const mockFieldContext = {
        name: undefined,
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          name: 'localName',
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      expect(selectors.name(store.state)).toBe('localName');
    });
  });

  describe('setFilled integration via observe', () => {
    it('should call setFilled(true) when value changes from null to non-null', () => {
      const setFilledSpy = vi.fn();
      const mockFieldContext = {
        setFilled: setFilledSpy,
        setDirty: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      // Initial value is null, so setFilled should not be called yet for the initial state
      // But the effect should be registered

      // Change value to non-null
      store.updateFromString('01/15/2024');

      // setFilled should be called with true
      expect(setFilledSpy.mock.calls.length).toBeGreaterThan(0);
      expect(setFilledSpy.mock.calls.at(-1)![0]).toBe(true);
    });

    it('should call setFilled(false) when value changes from non-null to null', () => {
      const setFilledSpy = vi.fn();
      const mockFieldContext = {
        setFilled: setFilledSpy,
        setDirty: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-15', 'default'),
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      // Value is initially non-null, effect is registered so setFilled should be called on mount
      // The effect triggers when value changes
      setFilledSpy.mockClear();

      // Change value to null
      store.clear();

      // setFilled should be called with false
      expect(setFilledSpy.mock.calls.length).toBeGreaterThan(0);
      expect(setFilledSpy.mock.calls.at(-1)![0]).toBe(false);
    });

    it('should not call setFilled when fieldContext is null', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      // This should not throw even without fieldContext
      store.updateFromString('01/15/2024');

      // No error should occur - value is stored as a Date object
      expect(store.state.value).not.toBe(null);
      expect(adapter.isValid(store.state.value)).toBe(true);
    });
  });

  describe('setDirty integration in publish()', () => {
    it('should call setDirty(false) when value equals initial value', () => {
      const setDirtySpy = vi.fn();
      const initialValue = adapter.date('2024-01-15', 'default');
      const mockFieldContext = {
        setDirty: setDirtySpy,
        setFilled: () => {},
        validityData: { initialValue },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-15', 'default'),
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      setDirtySpy.mockClear();

      // Set value to same as initial
      store.updateFromString('01/15/2024');

      // setDirty should be called with false
      expect(setDirtySpy.mock.calls.length).toBeGreaterThan(0);
      expect(setDirtySpy.mock.calls.at(-1)![0]).toBe(false);
    });

    it('should call setDirty(true) when value differs from initial value', () => {
      const setDirtySpy = vi.fn();
      const initialValue = adapter.date('2024-01-15', 'default');
      const mockFieldContext = {
        setDirty: setDirtySpy,
        setFilled: () => {},
        validityData: { initialValue },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-15', 'default'),
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      setDirtySpy.mockClear();

      // Set value to different from initial
      store.updateFromString('01/16/2024');

      // setDirty should be called with true
      expect(setDirtySpy.mock.calls.length).toBeGreaterThan(0);
      expect(setDirtySpy.mock.calls.at(-1)![0]).toBe(true);
    });

    it('should not call setDirty when fieldContext is null', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue: adapter.date('2024-01-15', 'default'),
        },
        dateFieldConfig,
      );

      // This should not throw even without fieldContext
      store.updateFromString('01/16/2024');

      // No error should occur - value is stored as a Date object
      expect(store.state.value).not.toBe(null);
      expect(adapter.isValid(store.state.value)).toBe(true);
    });
  });

  describe('validation integration in publish()', () => {
    it('should call validation.commit() when shouldValidateOnChange returns true', () => {
      const validationCommitSpy = vi.fn();
      const shouldValidateOnChangeSpy = vi.fn(() => true);
      const mockFieldContext = {
        setDirty: () => {},
        setFilled: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: shouldValidateOnChangeSpy,
        validation: { commit: validationCommitSpy },
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      // Change value
      store.updateFromString('01/15/2024');

      // shouldValidateOnChange should be called
      expect(shouldValidateOnChangeSpy.mock.calls.length).toBeGreaterThan(0);

      // validation.commit should be called with the new value (Date object)
      expect(validationCommitSpy.mock.calls.length).toBeGreaterThan(0);
      expect(adapter.isValid(validationCommitSpy.mock.calls.at(-1)![0])).toBe(true);
    });

    it('should not call validation.commit() when shouldValidateOnChange returns false', () => {
      const validationCommitSpy = vi.fn();
      const shouldValidateOnChangeSpy = vi.fn(() => false);
      const mockFieldContext = {
        setDirty: () => {},
        setFilled: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: shouldValidateOnChangeSpy,
        validation: { commit: validationCommitSpy },
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      // Change value
      store.updateFromString('01/15/2024');

      // shouldValidateOnChange should be called
      expect(shouldValidateOnChangeSpy.mock.calls.length).toBeGreaterThan(0);

      // validation.commit should NOT be called
      expect(validationCommitSpy.mock.calls.length).toBe(0);
    });

    it('should not call validation when fieldContext is null', () => {
      const store = new TemporalFieldStore(DEFAULT_PARAMETERS, dateFieldConfig);

      // This should not throw even without fieldContext
      store.updateFromString('01/15/2024');

      // No error should occur - value is stored as a Date object
      expect(store.state.value).not.toBe(null);
      expect(adapter.isValid(store.state.value)).toBe(true);
    });
  });

  describe('TimeFieldStore - Field integration', () => {
    it('should store fieldContext in TimeFieldStore', () => {
      const mockFieldContext = {
        name: 'timeField',
        state: { disabled: false },
        setFilled: () => {},
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          fieldContext: mockFieldContext,
        },
        timeFieldConfig,
      );

      expect(store.state.fieldContext).toBe(mockFieldContext);
    });

    it('should call setDirty when time value changes', () => {
      const setDirtySpy = vi.fn();
      const mockFieldContext = {
        setDirty: setDirtySpy,
        setFilled: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          fieldContext: mockFieldContext,
        },
        timeFieldConfig,
      );

      setDirtySpy.mockClear();

      // Change time value
      store.updateFromString('14:30');

      // setDirty should be called with true (differs from initial null)
      expect(setDirtySpy.mock.calls.length).toBeGreaterThan(0);
      expect(setDirtySpy.mock.calls.at(-1)![0]).toBe(true);
    });

    it('should call validation.commit() for time values', () => {
      const validationCommitSpy = vi.fn();
      const mockFieldContext = {
        setDirty: () => {},
        setFilled: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => true,
        validation: { commit: validationCommitSpy },
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          fieldContext: mockFieldContext,
        },
        timeFieldConfig,
      );

      // Change time value
      store.updateFromString('14:30');

      // validation.commit should be called with the new value (PlainTime object)
      expect(validationCommitSpy.mock.calls.length).toBeGreaterThan(0);
      expect(adapter.isValid(validationCommitSpy.mock.calls.at(-1)![0])).toBe(true);
    });

    it('should call setFilled when time value changes', () => {
      const setFilledSpy = vi.fn();
      const mockFieldContext = {
        setFilled: setFilledSpy,
        setDirty: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          fieldContext: mockFieldContext,
        },
        timeFieldConfig,
      );

      setFilledSpy.mockClear();

      // Change time value to non-null
      store.updateFromString('14:30');

      // setFilled should be called with true
      expect(setFilledSpy.mock.calls.length).toBeGreaterThan(0);
      expect(setFilledSpy.mock.calls.at(-1)![0]).toBe(true);
    });
  });

  describe('onValueChange integration', () => {
    it('should call onValueChange before Field callbacks', () => {
      const callOrder: string[] = [];
      const onValueChangeSpy = vi.fn(() => callOrder.push('onValueChange'));
      const setDirtySpy = vi.fn(() => callOrder.push('setDirty'));

      const mockFieldContext = {
        setDirty: setDirtySpy,
        setFilled: () => {},
        validityData: { initialValue: null },
        shouldValidateOnChange: () => false,
      } as any;

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
          fieldContext: mockFieldContext,
        },
        dateFieldConfig,
      );

      // Change value
      store.updateFromString('01/15/2024');

      // onValueChange should be called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
      // Value is passed as Date object
      if (
        onValueChangeSpy.mock.calls.length > 0 &&
        onValueChangeSpy.mock.calls.at(-1)!.length > 0
      ) {
        expect(adapter.isValid(onValueChangeSpy.mock.calls.at(-1)![0 as any]!)).toBe(true);
      }

      // setDirty should also be called
      expect(setDirtySpy.mock.calls.length).toBeGreaterThan(0);

      // onValueChange should be called before setDirty
      expect(callOrder[0]).toBe('onValueChange');
      expect(callOrder[1]).toBe('setDirty');
    });
  });

  describe('usage without Field', () => {
    it('should work without Field context (standalone mode)', () => {
      const onValueChangeSpy = vi.fn();

      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
          disabled: true,
          name: 'standaloneField',
        },
        dateFieldConfig,
      );

      // Should work normally without Field context
      expect(store.state.disabledProp).toBe(true);
      expect(store.state.nameProp).toBe('standaloneField');
      expect(store.state.fieldContext).toBe(null);

      // Value changes should work
      store.updateFromString('01/15/2024');

      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
      // Value is passed as Date object
      if (
        onValueChangeSpy.mock.calls.length > 0 &&
        onValueChangeSpy.mock.calls.at(-1)!.length > 0
      ) {
        expect(adapter.isValid(onValueChangeSpy.mock.calls.at(-1)![0])).toBe(true);
      }
      expect(adapter.isValid(store.state.value)).toBe(true);
    });
  });

  describe('E2E editing scenarios', () => {
    it('should handle complete date entry in MM/DD/YYYY format', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Fill month
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '03',
        shouldGoToNextSection: true,
      });

      // Fill day
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '15',
        shouldGoToNextSection: true,
      });

      // Fill year
      store.selectClosestDatePart(4);
      store.updateDatePart({
        sectionIndex: 4,
        newDatePartValue: '2024',
        shouldGoToNextSection: false,
      });

      // Verify final value
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(2); // March (0-indexed)
      expect(adapter.getDate(value!)).toBe(15);
      expect(adapter.getYear(value!)).toBe(2024);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle complete date entry with letter month (MMM DD, YYYY)', () => {
      const monthNameFormat = `${adapter.formats.month3Letters} ${adapter.formats.dayOfMonthPadded}, ${adapter.formats.yearPadded}`;
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: monthNameFormat,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Fill month with letter
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: 'Feb',
        shouldGoToNextSection: true,
      });

      // Fill day
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '14',
        shouldGoToNextSection: true,
      });

      // Fill year
      store.selectClosestDatePart(4);
      store.updateDatePart({
        sectionIndex: 4,
        newDatePartValue: '2024',
        shouldGoToNextSection: false,
      });

      // Verify final value
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(1); // February (0-indexed)
      expect(adapter.getDate(value!)).toBe(14);
      expect(adapter.getYear(value!)).toBe(2024);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle complete time entry in 24-hour format (HH:mm)', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time24Format,
          onValueChange: onValueChangeSpy,
        },
        timeFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Fill hour
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '14',
        shouldGoToNextSection: true,
      });

      // Fill minute
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '30',
        shouldGoToNextSection: false,
      });

      // Verify final value
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getHours(value!)).toBe(14);
      expect(adapter.getMinutes(value!)).toBe(30);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle complete time entry in 12-hour format with meridiem (hh:mm aa)', () => {
      const time12Format = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: time12Format,
          onValueChange: onValueChangeSpy,
        },
        timeFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Fill hour
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '02',
        shouldGoToNextSection: true,
      });

      // Fill minute
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '30',
        shouldGoToNextSection: true,
      });

      // Fill meridiem
      store.selectClosestDatePart(4);
      store.updateDatePart({
        sectionIndex: 4,
        newDatePartValue: 'PM',
        shouldGoToNextSection: false,
      });

      // Verify final value (2:30 PM = 14:30)
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getHours(value!)).toBe(14);
      expect(adapter.getMinutes(value!)).toBe(30);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle complete date entry in DD/MM/YYYY format', () => {
      const europeanDateFormat = `${adapter.formats.dayOfMonthPadded}/${adapter.formats.monthPadded}/${adapter.formats.yearPadded}`;
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          format: europeanDateFormat,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Fill day
      store.selectClosestDatePart(0);
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '25',
        shouldGoToNextSection: true,
      });

      // Fill month
      store.selectClosestDatePart(2);
      store.updateDatePart({
        sectionIndex: 2,
        newDatePartValue: '12',
        shouldGoToNextSection: true,
      });

      // Fill year
      store.selectClosestDatePart(4);
      store.updateDatePart({
        sectionIndex: 4,
        newDatePartValue: '2024',
        shouldGoToNextSection: false,
      });

      // Verify final value
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getDate(value!)).toBe(25);
      expect(adapter.getMonth(value!)).toBe(11); // December (0-indexed)
      expect(adapter.getYear(value!)).toBe(2024);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle pasting complete date string', () => {
      const onValueChangeSpy = vi.fn();
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          onValueChange: onValueChangeSpy,
        },
        dateFieldConfig,
      );

      // Start with empty field
      expect(store.state.value).toBe(null);

      // Paste complete date
      store.updateFromString('03/15/2024');

      // Verify final value
      const value = store.state.value;
      expect(adapter.isValid(value)).toBe(true);
      expect(adapter.getMonth(value!)).toBe(2); // March (0-indexed)
      expect(adapter.getDate(value!)).toBe(15);
      expect(adapter.getYear(value!)).toBe(2024);

      // onValueChange should have been called
      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
      if (
        onValueChangeSpy.mock.calls.length > 0 &&
        onValueChangeSpy.mock.calls.at(-1)!.length > 0
      ) {
        expect(adapter.isValid(onValueChangeSpy.mock.calls.at(-1)![0])).toBe(true);
      }
    });
  });

  describe('simultaneous format and value changes', () => {
    const europeanDateFormat = `${adapter.formats.dayOfMonthPadded}/${adapter.formats.monthPadded}/${adapter.formats.yearPadded}`;

    it('should clear sectionToUpdateOnNextInvalidDate when format changes', () => {
      const defaultValue = adapter.date('2024-01-30', 'default');
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          defaultValue,
        },
        dateFieldConfig,
      );

      // Edit month from 01 to 02: Jan 30 → Feb 30 (invalid) → sets sectionToUpdateOnNextInvalidDate
      store.selectClosestDatePart(0); // month section
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '02',
        shouldGoToNextSection: false,
      });

      expect((store as any).sectionToUpdateOnNextInvalidDate).not.toBe(null);

      // Change format (simulates parent re-render with new format prop)
      // The format store effect will detect the rawFormat change and rebuild sections.
      store.update({ rawFormat: europeanDateFormat });

      // The stale pending patch should have been cleared
      expect((store as any).sectionToUpdateOnNextInvalidDate).toBe(null);
    });

    it('should not corrupt sections when format and value change simultaneously with a pending invalid date', () => {
      const store = new TemporalFieldStore(
        {
          ...DEFAULT_PARAMETERS,
          value: adapter.date('2024-01-30', 'default'),
        },
        dateFieldConfig,
      );

      // Edit month from 01 to 02: Jan 30 → Feb 30 (invalid) → sets sectionToUpdateOnNextInvalidDate
      store.selectClosestDatePart(0); // month section
      store.updateDatePart({
        sectionIndex: 0,
        newDatePartValue: '02',
        shouldGoToNextSection: false,
      });

      expect((store as any).sectionToUpdateOnNextInvalidDate).not.toBe(null);

      // Simulate parent re-render that changes BOTH format and value.
      // In the real component, useSyncedValues fires first (updating rawFormat),
      // then useControlledProp fires second (updating valueProp).
      const newValue = adapter.date('2024-06-15', 'default');
      store.update({ rawFormat: europeanDateFormat });
      store.set('valueProp', newValue);

      // Sections should reflect the NEW format (dd/MM/yyyy) with the NEW value
      const sections = store.state.sections.filter((s) => s.type === 'datePart');
      expect(sections[0].value).toBe('15'); // day first in european format
      expect(sections[1].value).toBe('06'); // month second
      expect(sections[2].value).toBe('2024'); // year
    });
  });
});
