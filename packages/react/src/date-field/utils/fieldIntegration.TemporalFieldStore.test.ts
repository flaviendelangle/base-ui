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

});
