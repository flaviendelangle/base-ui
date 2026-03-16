import {
  TemporalAdapter,
  TemporalTimezone,
  TemporalSupportedObject,
  TemporalFieldDatePartType,
} from '../../types/temporal';
import {
  isAfterDay,
  isBeforeDay,
  isTimePartAfter,
  isTimePartBefore,
  mergeDateAndTime,
} from './date-helpers';
import type { TemporalDateType } from './types';
import { ValidateDateValidationProps } from './validateDate';

function roundDate(
  adapter: TemporalAdapter,
  mostGranularPart: TemporalFieldDatePartType,
  date: TemporalSupportedObject,
) {
  switch (mostGranularPart) {
    case 'year':
      return adapter.startOfYear(date);
    case 'month':
      return adapter.startOfMonth(date);
    case 'day':
      return adapter.startOfDay(date);
    case 'hours':
      return adapter.startOfHour(date);
    case 'minutes':
      return adapter.startOfMinute(date);
    case 'seconds':
      return adapter.startOfSecond(date);
    default:
      return date;
  }
}

/**
 * Checks if refDate is before boundary, using comparison appropriate for the dateType.
 * - 'date': compares day only (ignores time)
 * - 'time': compares time-of-day only (ignores date)
 * - 'date-time': compares the full timestamp
 */
function isBeforeForType(
  adapter: TemporalAdapter,
  dateType: TemporalDateType,
  refDate: TemporalSupportedObject,
  boundary: TemporalSupportedObject,
): boolean {
  switch (dateType) {
    case 'date':
      return isBeforeDay(adapter, refDate, boundary);
    case 'time':
      return isTimePartBefore(adapter, refDate, boundary);
    case 'date-time':
    default:
      return adapter.isBefore(refDate, boundary);
  }
}

/**
 * Checks if refDate is after boundary, using comparison appropriate for the dateType.
 * - 'date': compares day only (ignores time)
 * - 'time': compares time-of-day only (ignores date)
 * - 'date-time': compares the full timestamp
 */
function isAfterForType(
  adapter: TemporalAdapter,
  dateType: TemporalDateType,
  refDate: TemporalSupportedObject,
  boundary: TemporalSupportedObject,
): boolean {
  switch (dateType) {
    case 'date':
      return isAfterDay(adapter, refDate, boundary);
    case 'time':
      return isTimePartAfter(adapter, refDate, boundary);
    case 'date-time':
    default:
      return adapter.isAfter(refDate, boundary);
  }
}

/**
 * Clamps refDate to a boundary, using a strategy appropriate for the dateType.
 * - 'time': only replaces the time portion, keeping the date from refDate
 * - 'date' / 'date-time': replaces the full date with the boundary
 */
function clampToBoundary(
  adapter: TemporalAdapter,
  dateType: TemporalDateType,
  granularity: TemporalFieldDatePartType,
  refDate: TemporalSupportedObject,
  boundary: TemporalSupportedObject,
): TemporalSupportedObject {
  if (dateType === 'time') {
    // Only merge time, keep the date portion from refDate
    return roundDate(adapter, granularity, mergeDateAndTime(adapter, refDate, boundary));
  }
  return roundDate(adapter, granularity, boundary);
}

export function getInitialReferenceDate(
  parameters: GetInitialReferenceDateParameters,
): TemporalSupportedObject {
  const {
    adapter,
    timezone,
    granularity,
    dateType,
    externalDate,
    externalReferenceDate,
    validationProps: { min, max },
  } = parameters;

  if (externalDate != null && adapter.isValid(externalDate)) {
    return adapter.setTimezone(externalDate, timezone);
  }

  if (externalReferenceDate != null && adapter.isValid(externalReferenceDate)) {
    return adapter.setTimezone(externalReferenceDate, timezone);
  }

  let referenceDate = roundDate(adapter, granularity, adapter.now(timezone));

  if (min != null && adapter.isValid(min) && isBeforeForType(adapter, dateType, referenceDate, min)) {
    referenceDate = clampToBoundary(adapter, dateType, granularity, referenceDate, min);
  }

  if (max != null && adapter.isValid(max) && isAfterForType(adapter, dateType, referenceDate, max)) {
    referenceDate = clampToBoundary(adapter, dateType, granularity, referenceDate, max);
  }

  return referenceDate;
}

export interface GetInitialReferenceDateParameters {
  /**
   * The adapter used to manipulate the date.
   */
  adapter: TemporalAdapter;
  /**
   * The date provided by the user, if any.
   * If the component is a range component, this will be the start date if defined or the end date otherwise.
   */
  externalDate: TemporalSupportedObject | null | undefined;
  /**
   * The reference date provided by the user, if any.
   */
  externalReferenceDate: TemporalSupportedObject | null | undefined;
  /**
   * The timezone the reference date should be in.
   */
  timezone: TemporalTimezone;
  /**
   * The props used to validate the date, time or date-time object.
   */
  validationProps: GetInitialReferenceDateValidationProps;
  /**
   * The most granular date part used in the component.
   */
  granularity: TemporalFieldDatePartType;
  /**
   * The type of date handled by the component.
   * Controls how min/max comparisons are performed:
   * - 'date': compares day only
   * - 'time': compares time-of-day only
   * - 'date-time': compares full timestamp
   */
  dateType: TemporalDateType;
}

export type GetInitialReferenceDateValidationProps = ValidateDateValidationProps;
