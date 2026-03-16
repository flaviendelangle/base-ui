import { TemporalAdapter, TemporalFieldDatePartType, TemporalValue } from '../../types/temporal';
import {
  TemporalFieldConfiguration,
  HiddenInputValidationProps,
} from '../../date-field/utils/types';
import {
  baseTemporalFieldConfig,
  STEP_MULTIPLIERS,
} from '../../date-field/utils/baseTemporalFieldConfig';
import { getDateTimeManager } from '../../utils/temporal/getDateTimeManager';
/**
 * Formats a datetime value for native input.
 * Returns '' for invalid/empty input to trigger valueMissing validation if required.
 */
function formatDateTimeForNativeInput(
  adapter: TemporalAdapter,
  value: TemporalValue,
  granularity: TemporalFieldDatePartType,
): string {
  if (!adapter.isValid(value)) {
    return '';
  }

  const f = adapter.formats;
  const c = adapter.escapedCharacters;
  return adapter.formatByString(
    value,
    granularity === 'seconds'
      ? `${f.yearPadded}-${f.monthPadded}-${f.dayOfMonthPadded}${c.start}T${c.end}${f.hours24hPadded}:${f.minutesPadded}:${f.secondsPadded}`
      : `${f.yearPadded}-${f.monthPadded}-${f.dayOfMonthPadded}${c.start}T${c.end}${f.hours24hPadded}:${f.minutesPadded}`,
  );
}

/**
 * Formats a datetime value for min/max attributes.
 * Always includes seconds for rounding purposes.
 */
function formatDateTimeForMinMax(adapter: TemporalAdapter, value: TemporalValue): string {
  return formatDateTimeForNativeInput(adapter, value, 'seconds');
}

export const dateTimeFieldConfig: TemporalFieldConfiguration<TemporalValue> = {
  ...baseTemporalFieldConfig,
  getManager: getDateTimeManager,
  hiddenInputType: 'datetime-local',
  stringifyValueForHiddenInput: formatDateTimeForNativeInput,
  stringifyValidationPropsForHiddenInput: (adapter, validationProps, parsedFormat, step) => {
    // Use parsedFormat.granularity to determine step multiplier
    const multiplier = STEP_MULTIPLIERS[parsedFormat.granularity] ?? 60;
    const nativeStep = step * multiplier;

    const result: HiddenInputValidationProps = {
      step: String(nativeStep),
    };

    // Always include seconds in min/max for rounding purposes
    if (validationProps.min) {
      const formatted = formatDateTimeForMinMax(adapter, validationProps.min);
      if (formatted) {
        result.min = formatted;
      }
    }
    if (validationProps.max) {
      const formatted = formatDateTimeForMinMax(adapter, validationProps.max);
      if (formatted) {
        result.max = formatted;
      }
    }

    return result;
  },
};

export function getDateTimeFieldDefaultFormat(adapter: TemporalAdapter, ampm: boolean | undefined) {
  const ampmWithDefault = ampm ?? adapter.is12HourCycleInCurrentLocale();
  const f = adapter.formats;
  const c = adapter.escapedCharacters;
  return ampmWithDefault
    ? `${f.localizedNumericDate}${c.start},${c.end} ${f.hours12hPadded}:${f.minutesPadded} ${f.meridiem}`
    : `${f.localizedNumericDate}${c.start},${c.end} ${f.hours24hPadded}:${f.minutesPadded}`;
}

export type { AmPmParameters } from '../../time-field/root/timeFieldConfig';
