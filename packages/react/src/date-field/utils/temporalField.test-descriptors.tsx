import * as React from 'react';
import { DateField as DateFieldBase } from '@base-ui/react/date-field';
import { TimeField as TimeFieldBase } from '@base-ui/react/time-field';
import { DateTimeField as DateTimeFieldBase } from '@base-ui/react/date-time-field';
import { createTemporalRenderer } from '#test-utils';

const { adapter } = createTemporalRenderer();

export { adapter };

export interface TemporalFieldTestDescriptor {
  name: string;
  /** Wrapper that renders Root + Section children */
  Field: React.ComponentType<any>;
  /** Wrapper that renders Root + SectionList + Section + Clear */
  FieldWithClear: React.ComponentType<any>;
  defaultFormat: string;
  defaultValueISO: string;
  updatedValueISO: string;
  expectedSectionCount: number;
  expectedSectionLabels: string[];
  hiddenInputType: string;
  expectedHiddenValue: string;
  expectedUpdatedHiddenValue: string;
  fieldName: string;
  minValueISO: string;
  maxValueISO: string;
  expectedMinHidden: string;
  expectedMaxHidden: string;
  /** Expected aria-valuenow values for the default value, keyed by aria-label */
  expectedSectionValues: Record<string, string>;
  /** Expected aria-valuenow values after updating to updatedValueISO */
  expectedUpdatedSectionValues: Record<string, string>;
  /** Error message for rangeUnderflow validation */
  underflowError: string;
  /** Error message for rangeOverflow validation */
  overflowError: string;
  /** Error message for valueMissing validation */
  missingError: string;
  /** Value ISO that is before minValueISO */
  valueBelowMinISO: string;
  /** Value ISO that is after maxValueISO */
  valueAboveMaxISO: string;
}

// --- DateField ---

function DateField(props: DateFieldBase.Root.Props) {
  return (
    <DateFieldBase.Root {...props} data-testid="input">
      {(section) => <DateFieldBase.Section key={section.index} section={section} />}
    </DateFieldBase.Root>
  );
}

function DateFieldWithClear(props: DateFieldBase.Root.Props) {
  return (
    <DateFieldBase.Root {...props} data-testid="input">
      <DateFieldBase.SectionList>
        {(section) => <DateFieldBase.Section key={section.index} section={section} />}
      </DateFieldBase.SectionList>
      <DateFieldBase.Clear data-testid="clear" />
    </DateFieldBase.Root>
  );
}

export const dateFieldDescriptor: TemporalFieldTestDescriptor = {
  name: 'DateField',
  Field: DateField,
  FieldWithClear: DateFieldWithClear,
  defaultFormat: `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded}`,
  defaultValueISO: '2024-03-15',
  updatedValueISO: '2024-06-20',
  expectedSectionCount: 3,
  expectedSectionLabels: ['Month', 'Day', 'Year'],
  hiddenInputType: 'date',
  expectedHiddenValue: '2024-03-15',
  expectedUpdatedHiddenValue: '2024-06-20',
  fieldName: 'birthdate',
  minValueISO: '2024-03-15',
  maxValueISO: '2024-03-15',
  expectedMinHidden: '2024-03-15',
  expectedMaxHidden: '2024-03-15',
  expectedSectionValues: { Month: '3', Day: '15', Year: '2024' },
  expectedUpdatedSectionValues: { Month: '6', Day: '20', Year: '2024' },
  underflowError: 'Date is too early',
  overflowError: 'Date is too late',
  missingError: 'Date is required',
  valueBelowMinISO: '2024-03-10',
  valueAboveMaxISO: '2024-03-20',
};

// --- TimeField ---

function TimeField(props: TimeFieldBase.Root.Props) {
  return (
    <TimeFieldBase.Root {...props} data-testid="input">
      {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
    </TimeFieldBase.Root>
  );
}

function TimeFieldWithClear(props: TimeFieldBase.Root.Props) {
  return (
    <TimeFieldBase.Root {...props} data-testid="input">
      <TimeFieldBase.SectionList>
        {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
      </TimeFieldBase.SectionList>
      <TimeFieldBase.Clear data-testid="clear" />
    </TimeFieldBase.Root>
  );
}

export const timeFieldDescriptor: TemporalFieldTestDescriptor = {
  name: 'TimeField',
  Field: TimeField,
  FieldWithClear: TimeFieldWithClear,
  defaultFormat: `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`,
  defaultValueISO: '2024-01-15T14:30',
  updatedValueISO: '2024-01-15T14:45',
  expectedSectionCount: 2,
  expectedSectionLabels: ['Hours', 'Minutes'],
  hiddenInputType: 'time',
  expectedHiddenValue: '14:30',
  expectedUpdatedHiddenValue: '14:45',
  fieldName: 'appointmentTime',
  minValueISO: '2024-03-20T09:00',
  maxValueISO: '2024-03-20T17:00',
  expectedMinHidden: '09:00:00',
  expectedMaxHidden: '17:00:00',
  expectedSectionValues: { Hours: '14', Minutes: '30' },
  expectedUpdatedSectionValues: { Hours: '14', Minutes: '45' },
  underflowError: 'Time is too early',
  overflowError: 'Time is too late',
  missingError: 'Time is required',
  valueBelowMinISO: '2024-03-20T08:30',
  valueAboveMaxISO: '2024-03-20T18:30',
};

// --- DateTimeField ---

function DateTimeField(props: DateTimeFieldBase.Root.Props) {
  return (
    <DateTimeFieldBase.Root {...props} data-testid="input">
      {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
    </DateTimeFieldBase.Root>
  );
}

function DateTimeFieldWithClear(props: DateTimeFieldBase.Root.Props) {
  return (
    <DateTimeFieldBase.Root {...props} data-testid="input">
      <DateTimeFieldBase.SectionList>
        {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
      </DateTimeFieldBase.SectionList>
      <DateTimeFieldBase.Clear data-testid="clear" />
    </DateTimeFieldBase.Root>
  );
}

export const dateTimeFieldDescriptor: TemporalFieldTestDescriptor = {
  name: 'DateTimeField',
  Field: DateTimeField,
  FieldWithClear: DateTimeFieldWithClear,
  defaultFormat: `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded} ${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`,
  defaultValueISO: '2024-03-15T14:30',
  updatedValueISO: '2024-06-20T09:15',
  expectedSectionCount: 5,
  expectedSectionLabels: ['Month', 'Day', 'Year', 'Hours', 'Minutes'],
  hiddenInputType: 'datetime-local',
  expectedHiddenValue: '2024-03-15T14:30',
  expectedUpdatedHiddenValue: '2024-06-20T09:15',
  fieldName: 'appointmentDateTime',
  minValueISO: '2024-01-01T09:00',
  maxValueISO: '2024-12-31T17:00',
  expectedMinHidden: '2024-01-01T09:00:00',
  expectedMaxHidden: '2024-12-31T17:00:00',
  expectedSectionValues: { Month: '3', Day: '15', Year: '2024', Hours: '14', Minutes: '30' },
  expectedUpdatedSectionValues: { Month: '6', Day: '20', Year: '2024', Hours: '9', Minutes: '15' },
  underflowError: 'Date is too early',
  overflowError: 'Date is too late',
  missingError: 'Date and time is required',
  valueBelowMinISO: '2023-12-31T10:00',
  valueAboveMaxISO: '2025-01-01T10:00',
};
