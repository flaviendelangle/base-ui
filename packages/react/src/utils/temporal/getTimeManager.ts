import { areDatesEqual } from './date-helpers';
import { TemporalManager } from './types';
import { TemporalValue, TemporalAdapter } from '../../types/temporal';

export function getTimeManager(adapter: TemporalAdapter): GetTimeManagerReturnValue {
  return {
    dateType: 'time',
    emptyValue: null,
    areValuesEqual: (valueA, valueB) => areDatesEqual(adapter, valueA, valueB),
    getTimezone: (value) => (adapter.isValid(value) ? adapter.getTimezone(value) : null),
    setTimezone: (value, timezone) => (value == null ? null : adapter.setTimezone(value, timezone)),
    getDatesFromValue: (value) => (value == null ? [] : [value]),
  };
}

export type GetTimeManagerReturnValue = TemporalManager<TemporalValue>;
