import { TemporalValue } from '../../types/temporal';
import { TemporalFieldConfiguration } from './types';
import { isDatePart } from './utils';
import { getInitialReferenceDate } from '../../utils/temporal/getInitialReferenceDate';

/**
 * Shared config methods that are identical across DateField, TimeField, and DateTimeField.
 * Each field type extends this with its own `getManager`, `hiddenInputType`,
 * `stringifyValueForHiddenInput`, and `stringifyValidationPropsForHiddenInput`.
 */
export const baseTemporalFieldConfig: Pick<
  TemporalFieldConfiguration<TemporalValue>,
  | 'getSectionsFromValue'
  | 'getDateFromSection'
  | 'getDateSectionsFromValue'
  | 'updateDateInValue'
  | 'parseValueStr'
  | 'getInitialReferenceValue'
  | 'clearDateSections'
  | 'updateReferenceValue'
  | 'stringifyValue'
> = {
  getSectionsFromValue: (date, getSectionsFromDate) => getSectionsFromDate(date),
  getDateFromSection: (value) => value,
  getDateSectionsFromValue: (sections) => sections,
  updateDateInValue: (value, activeSection, activeDate) => activeDate,
  parseValueStr: (valueStr, referenceValue, parseDate) =>
    parseDate(valueStr.trim(), referenceValue),
  getInitialReferenceValue: ({ value, ...other }) =>
    getInitialReferenceDate({ ...other, externalDate: value }),

  clearDateSections: (sections) =>
    sections.map((section) => (isDatePart(section) ? { ...section, value: '' } : section)),
  updateReferenceValue: (adapter, value, prevReferenceValue) =>
    adapter.isValid(value) ? value : prevReferenceValue,
  stringifyValue: (adapter, value) =>
    adapter.isValid(value) ? adapter.toJsDate(value).toISOString() : '',
};

/**
 * Multipliers to convert props.step to native input step (in seconds).
 * Shared between TimeField and DateTimeField configs.
 */
export const STEP_MULTIPLIERS: Partial<Record<string, number>> = {
  hours: 3600,
  minutes: 60,
  seconds: 1,
};
