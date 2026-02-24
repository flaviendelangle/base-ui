import type { TemporalFieldDatePartType } from '../types';

export interface BaseUITranslations {
  /** Label for the year section of a temporal field. Used as aria-label. */
  temporalFieldYearSectionLabel: string;
  /** Label for the month section of a temporal field. Used as aria-label. */
  temporalFieldMonthSectionLabel: string;
  /** Label for the day section of a temporal field. Used as aria-label. */
  temporalFieldDaySectionLabel: string;
  /** Label for the week day section of a temporal field. Used as aria-label. */
  temporalFieldWeekDaySectionLabel: string;
  /** Label for the hours section of a temporal field. Used as aria-label. */
  temporalFieldHoursSectionLabel: string;
  /** Label for the minutes section of a temporal field. Used as aria-label. */
  temporalFieldMinutesSectionLabel: string;
  /** Label for the seconds section of a temporal field. Used as aria-label. */
  temporalFieldSecondsSectionLabel: string;
  /** Label for the meridiem (AM/PM) section of a temporal field. Used as aria-label. */
  temporalFieldMeridiemSectionLabel: string;
  /** Text displayed as aria-valuetext when a temporal field section is empty. */
  temporalFieldEmptySectionText: string;
}

/**
 * Maps TemporalFieldDatePartType to the corresponding translation key for section labels.
 */
export const temporalFieldSectionLabelKey: Record<
  TemporalFieldDatePartType,
  keyof BaseUITranslations
> = {
  year: 'temporalFieldYearSectionLabel',
  month: 'temporalFieldMonthSectionLabel',
  day: 'temporalFieldDaySectionLabel',
  weekDay: 'temporalFieldWeekDaySectionLabel',
  hours: 'temporalFieldHoursSectionLabel',
  minutes: 'temporalFieldMinutesSectionLabel',
  seconds: 'temporalFieldSecondsSectionLabel',
  meridiem: 'temporalFieldMeridiemSectionLabel',
};
