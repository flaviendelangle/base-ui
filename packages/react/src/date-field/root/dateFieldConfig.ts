import { TemporalAdapter, TemporalValue } from '../../types/temporal';
import { TemporalFieldConfiguration, HiddenInputValidationProps } from '../utils/types';
import { baseTemporalFieldConfig } from '../utils/baseTemporalFieldConfig';
import { getDateManager } from '../../utils/temporal/getDateManager';
/**
 * Formats a date value for native input.
 * Returns '' for invalid/empty input to trigger valueMissing validation if required.
 */
function formatDateForNativeInput(adapter: TemporalAdapter, value: TemporalValue): string {
  if (!adapter.isValid(value)) {
    return '';
  }
  const f = adapter.formats;
  return adapter.formatByString(value, `${f.yearPadded}-${f.monthPadded}-${f.dayOfMonthPadded}`);
}

export const dateFieldConfig: TemporalFieldConfiguration<TemporalValue> = {
  ...baseTemporalFieldConfig,
  getManager: getDateManager,
  hiddenInputType: 'date',
  stringifyValueForHiddenInput: formatDateForNativeInput,
  stringifyValidationPropsForHiddenInput: (adapter, validationProps) => {
    const result: HiddenInputValidationProps = {};
    if (validationProps.min) {
      const formatted = formatDateForNativeInput(adapter, validationProps.min);
      if (formatted) {
        result.min = formatted;
      }
    }
    if (validationProps.max) {
      const formatted = formatDateForNativeInput(adapter, validationProps.max);
      if (formatted) {
        result.max = formatted;
      }
    }
    return result;
  },
};

export function getDateFieldDefaultFormat(adapter: TemporalAdapter) {
  return adapter.formats.localizedNumericDate;
}
