import { TemporalAdapter, TemporalValue, TemporalSupportedObject } from '../../types/temporal';
import { isAfterDay, isBeforeDay } from './date-helpers';

export function validateDate(parameters: ValidateDateParameters): ValidateDateReturnValue {
  const { adapter, value, validationProps } = parameters;
  if (value === null) {
    return null;
  }

  const { min, max } = validationProps;

  if (!adapter.isValid(value)) {
    return 'invalid';
  }
  if (min != null && adapter.isValid(min) && isBeforeDay(adapter, value, min)) {
    return 'rangeUnderflow';
  }
  if (max != null && adapter.isValid(max) && isAfterDay(adapter, value, max)) {
    return 'rangeOverflow';
  }
  return null;
}

export interface ValidateDateParameters {
  /**
   * The adapter used to manipulate the date.
   */
  adapter: TemporalAdapter;
  /**
   * The value to validate.
   */
  value: TemporalValue;
  /**
   * The props used to validate a date.
   */
  validationProps: ValidateDateValidationProps;
}

export interface ValidateDateValidationProps {
  /**
   * Minimal selectable date.
   */
  min?: TemporalSupportedObject | undefined;
  /**
   * Maximal selectable date.
   */
  max?: TemporalSupportedObject | undefined;
}

export type ValidateDateReturnValue = 'invalid' | 'rangeUnderflow' | 'rangeOverflow' | null;
