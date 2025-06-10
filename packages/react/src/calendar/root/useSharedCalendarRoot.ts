import * as React from 'react';
import { TemporalSupportedObject, TemporalSupportedValue } from '../../models';
import { validateDate, mergeDateAndTime } from '../../utils/temporal/date-helpers';
import { useTemporalAdapter } from '../../temporal-adapter-provider/TemporalAdapterContext';
import { useTemporalControlledValue } from '../../utils/temporal/useTemporalControlledValue';
import { SharedCalendarRootContext } from './SharedCalendarRootContext';
import { SharedCalendarRootVisibleDateContext } from './SharedCalendarRootVisibleDateContext';
import { useEventCallback } from '../../utils/useEventCallback';
import { TemporalManager, TemporalTimezoneProps } from '../../utils/temporal/types';
import { useControlled } from '../../utils/useControlled';
import { Store, useSelector } from '../../utils/store';
import { selectors, State } from '../store';
import { useLazyRef } from '../../utils/useLazyRef';
import { useModernLayoutEffect } from '../../utils/useModernLayoutEffect';
import { useAssertModelConsistency } from '../../utils/useAssertModelConsistency';

export function useSharedCalendarRoot<TValue extends TemporalSupportedValue, TError>(
  parameters: useSharedCalendarRoot.Parameters<TValue, TError>,
): useSharedCalendarRoot.ReturnValue {
  const adapter = useTemporalAdapter();

  const {
    // Form props
    readOnly = false,
    disabled = false,
    invalid,
    // Focus and navigation props
    monthPageSize = 1,
    // Value props
    defaultValue,
    onValueChange,
    value: valueProp,
    timezone: timezoneProp,
    referenceDate: referenceDateProp,
    // Visible date props
    onVisibleDateChange,
    visibleDate: visibleDateProp,
    defaultVisibleDate,
    // Validation props
    isDateUnavailable,
    minDate,
    maxDate,
    // Manager props
    manager,
    calendarValueManager: {
      getDateToUseForReferenceDate,
      onSelectDate,
      getActiveDateFromValue,
      getSelectedDatesFromValue,
    },
  } = parameters;

  useAssertModelConsistency({
    componentName: '(Range)Calendar',
    propName: 'value',
    controlled: valueProp,
    defaultValue: defaultValue ?? manager.emptyValue,
  });

  const store = useLazyRef(
    () =>
      new Store<State<TValue>>({
        adapter,
        manager,
        initialReferenceDateFromValue: getDateToUseForReferenceDate(
          valueProp ?? defaultValue ?? manager.emptyValue,
        ),
        value: valueProp ?? defaultValue ?? manager.emptyValue,
        timezoneProp,
        referenceDateProp,
        validationProps: { minDate, maxDate },
        isDateUnavailable,
        disabled,
        monthPageSize,
      }),
  ).current;
  const validationProps = useSelector(store, selectors.validationProps);
  const value = useSelector(store, selectors.valueWithTimezoneToRender) as TValue;
  const referenceDate = useSelector(store, selectors.referenceDate);

  const handleValueChangeWithContext = useEventCallback((newValue: TValue) => {
    onValueChange?.(newValue, {
      getValidationError: () => manager.getValidationError(newValue, store.state.validationProps),
    });
  });

  const { setValue } = useTemporalControlledValue({
    name: '(Range)CalendarRoot',
    timezone: timezoneProp,
    value: valueProp,
    defaultValue,
    referenceDate: referenceDateProp,
    onChange: handleValueChangeWithContext,
    manager,
  });

  const isInvalid = React.useMemo(() => {
    if (invalid != null) {
      return invalid;
    }

    const error = manager.getValidationError(value, validationProps);
    return manager.isValidationErrorEmpty(error);
  }, [manager, value, invalid, validationProps]);

  const initialReferenceDate = React.useRef(referenceDate).current;
  const dayGridsRef = React.useRef<Record<number, TemporalSupportedObject>>({});

  const registerDayGrid = useEventCallback((month: TemporalSupportedObject) => {
    const id = Math.random();
    dayGridsRef.current![id] = month;

    return () => {
      delete dayGridsRef.current[id];
    };
  });

  const isDateCellVisible = (date: TemporalSupportedObject) => {
    if (Object.values(dayGridsRef.current).length > 0) {
      return Object.values(dayGridsRef.current).every((month) => !adapter.isSameMonth(date, month));
    }

    return true;
  };

  const [visibleDate, setVisibleDate] = useControlled({
    name: '(Range)CalendarRoot',
    state: 'visibleDate',
    controlled: visibleDateProp,
    default: defaultVisibleDate ?? initialReferenceDate,
  });

  const handleVisibleDateChange = useEventCallback(
    (newVisibleDate: TemporalSupportedObject, skipIfAlreadyVisible: boolean) => {
      if (skipIfAlreadyVisible && isDateCellVisible(newVisibleDate)) {
        return;
      }

      onVisibleDateChange?.(newVisibleDate);
      setVisibleDate(newVisibleDate);
    },
  );

  const [prevValue, setPrevValue] = React.useState<TValue>(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const activeDate = getActiveDateFromValue(value);
    if (adapter.isValid(activeDate)) {
      handleVisibleDateChange(activeDate, true);
    }
  }

  const selectDate = useEventCallback<SharedCalendarRootContext['selectDate']>(
    (selectedDate: TemporalSupportedObject) => {
      if (readOnly) {
        return;
      }

      const activeDate = getActiveDateFromValue(value) ?? referenceDate;
      const cleanSelectedDate = mergeDateAndTime(adapter, selectedDate, activeDate);

      onSelectDate({
        setValue,
        prevValue: value,
        selectedDate: cleanSelectedDate,
        referenceDate,
      });
    },
  );

  const selectedDates = React.useMemo(
    () => getSelectedDatesFromValue(value),
    [getSelectedDatesFromValue, value],
  );

  // const changePage: NavigateInGridChangePage = (params) => {
  //   // TODO: Jump over months with no valid date.
  //   if (params.direction === 'previous') {
  //     const targetDate = adapter.addMonths(adapter.startOfMonth(visibleDate), -monthPageSize);
  //     const lastMonthInNewPage = adapter.addMonths(targetDate, monthPageSize - 1);

  //     // All the months before the visible ones are fully disabled, we skip the navigation.
  //     if (
  //       validationProps.minDate != null &&
  //       adapter.isAfter(adapter.startOfMonth(validationProps.minDate), lastMonthInNewPage)
  //     ) {
  //       return;
  //     }

  //     setVisibleDate(adapter.addMonths(visibleDate, -monthPageSize));
  //   }
  //   if (params.direction === 'next') {
  //     const targetDate = adapter.addMonths(adapter.startOfMonth(visibleDate), monthPageSize);

  //     // All the months after the visible ones are fully disabled, we skip the navigation.
  //     if (
  //       validationProps.maxDate != null &&
  //       adapter.isBefore(adapter.startOfMonth(validationProps.maxDate), targetDate)
  //     ) {
  //       return;
  //     }
  //     setVisibleDate(adapter.addMonths(visibleDate, monthPageSize));
  //   }

  //   pageNavigationTargetRef.current = params.target;
  // };

  const visibleDateContext: SharedCalendarRootVisibleDateContext = React.useMemo(
    () => ({ visibleDate }),
    [visibleDate],
  );

  const state: useSharedCalendarRoot.State = React.useMemo(
    () => ({
      empty: manager.areValuesEqual(value, manager.emptyValue),
      invalid: isInvalid,
      disabled,
      readOnly,
    }),
    [manager, value, isInvalid, disabled, readOnly],
  );

  const context: SharedCalendarRootContext = React.useMemo(
    () => ({
      referenceDate,
      selectedDates,
      setVisibleDate: handleVisibleDateChange,
      monthPageSize,
      registerDayGrid,
      selectDate,
      store,
    }),
    [
      referenceDate,
      selectedDates,
      handleVisibleDateChange,
      monthPageSize,
      registerDayGrid,
      selectDate,
      store,
    ],
  );

  useModernLayoutEffect(() => {
    store.apply({
      adapter,
      manager,
      timezoneProp,
      referenceDateProp,
      value: valueProp ?? defaultValue ?? manager.emptyValue,
      disabled,
      isDateUnavailable,
      monthPageSize,
    });
  }, [
    store,
    adapter,
    manager,
    timezoneProp,
    referenceDateProp,
    valueProp,
    defaultValue,
    disabled,
    isDateUnavailable,
    monthPageSize,
  ]);

  useModernLayoutEffect(() => {
    store.apply({ validationProps: { minDate, maxDate } });
  }, [store, minDate, maxDate]);

  return {
    state,
    context,
    visibleDateContext,
  };
}

export namespace useSharedCalendarRoot {
  export interface PublicParameters<TValue extends TemporalSupportedValue, TError>
    extends TemporalTimezoneProps,
      validateDate.ValidationProps {
    /**
     * The controlled value that should be selected.
     * To render an uncontrolled (Range)Calendar, use the `defaultValue` prop instead.
     */
    value?: TValue;
    /**
     * The uncontrolled value that should be initially selected.
     * To render a controlled (Range)Calendar, use the `value` prop instead.
     */
    defaultValue?: TValue;
    /**
     * Event handler called when the selected value changes.
     * Provides the new value as an argument.
     */
    onValueChange?: (value: TValue, context: ValueChangeHandlerContext<TError>) => void;
    /**
     * Whether the component should ignore user interaction.
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether the user should be unable to select a date in the calendar.
     * @default false
     */
    readOnly?: boolean;
    /**
     * Whether the calendar is forcefully marked as invalid.
     */
    invalid?: boolean;
    /**
     * Mark specific dates as unavailable.
     * Those dates will not be selectable but they will still be focusable with the keyboard.
     */
    isDateUnavailable?: (day: TemporalSupportedObject) => boolean;
    /**
     * The date used to decide which month should be displayed in the Days Grid and which year should be displayed in the Months List and Months Grid.
     * To render an uncontrolled Calendar, use the `defaultVisibleDate` prop instead.
     */
    visibleDate?: TemporalSupportedObject;
    /**
     * The date used to decide which month should be initially displayed in the Days Grid and which year should be initially displayed in the Months List and Months Grid.
     * To render a controlled Calendar, use the `visibleDate` prop instead.
     */
    defaultVisibleDate?: TemporalSupportedObject;
    /**
     * Event handler called when the visible date changes.
     * Provides the new visible date as an argument.
     * @param {TemporalSupportedObject} visibleDate The new visible date.
     */
    onVisibleDateChange?: (visibleDate: TemporalSupportedObject) => void;
    /**
     * The date used to generate the new value when both `value` and `defaultValue` are empty.
     * @default The closest valid date using the validation props.
     */
    referenceDate?: TemporalSupportedObject;
    /**
     * The amount of months to navigate by when pressing Calendar.SetNextMonth, Calendar.SetPreviousMonth or when using keyboard navigation in the day grid.
     * This is mostly useful when displaying multiple day grids.
     * @default 1
     */
    monthPageSize?: number;
  }

  export interface Parameters<TValue extends TemporalSupportedValue, TError>
    extends PublicParameters<TValue, TError> {
    /**
     * The manager of the calendar (uses `useDateManager` for Calendar and `useDateRangeManager` for RangeCalendar).
     */
    manager: TemporalManager<TValue, TError, any>;
    /**
     * The methods needed to manage the value of the calendar.
     * It helps sharing the code between the Calendar and the RangeCalendar.
     */
    calendarValueManager: ValueManager<TValue>;
  }

  export interface ReturnValue {
    state: State;
    context: SharedCalendarRootContext;
    visibleDateContext: SharedCalendarRootVisibleDateContext;
  }

  export interface ValueChangeHandlerContext<TError> {
    /**
     * The validation error associated to the new value.
     */
    getValidationError: () => TError;
  }

  export interface ValueManager<TValue extends TemporalSupportedValue> {
    /**
     * Returns the date to use for the reference date.
     */
    getDateToUseForReferenceDate: (value: TValue) => TemporalSupportedObject | null;
    /**
     * Runs logic when a date is selected.
     * This is used to correctly update the value on the Range Calendar.
     */
    onSelectDate: (parameters: OnSelectDateParameters<TValue>) => void;
    /**
     * Returns the active date from the value.
     * This is used to determine which date is being edited in the Range Calendar (start of end date).
     */
    getActiveDateFromValue: (value: TValue) => TemporalSupportedObject | null;
    /**
     * Returns list list of selected dates from the value.
     */
    getSelectedDatesFromValue: (value: TValue) => TemporalSupportedObject[];
  }

  export interface OnSelectDateParameters<TValue extends TemporalSupportedValue> {
    setValue: (value: TValue) => void;
    /**
     * The value before the change.
     */
    prevValue: TValue;
    /**
     * The date to select.
     */
    selectedDate: TemporalSupportedObject;
    /**
     * The reference date.
     */
    referenceDate: TemporalSupportedObject;
  }

  export interface CellRefs {
    cell: React.RefObject<HTMLButtonElement | null>;
    row: React.RefObject<HTMLDivElement | null>;
    grid: React.RefObject<HTMLElement | null>;
  }

  export interface State {
    /**
     * Whether the current value is empty.
     */
    empty: boolean;
    /**
     * Whether the current value is invalid.
     */
    invalid: boolean;
    /**
     * Whether the calendar is disabled.
     */
    disabled: boolean;
    /**
     * Whether the calendar is readonly.
     */
    readOnly?: boolean;
  }
}
