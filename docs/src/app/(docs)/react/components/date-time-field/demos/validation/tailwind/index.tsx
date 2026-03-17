'use client';
import * as React from 'react';
import { subDays } from 'date-fns/subDays';
import { addDays } from 'date-fns/addDays';
import { format } from 'date-fns/format';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { DateTimeField } from '@base-ui/react/date-time-field';

const today = new Date();
const min = subDays(today, 7);
const max = addDays(today, 7);

export default function ExampleDateTimeFieldValidation() {
  return (
    <Form
      className="flex flex-col gap-2 max-w-96"
      onFormSubmit={(formData) => {
        // eslint-disable-next-line no-alert
        alert(`Submitted: ${formData.datetime}`);
      }}
    >
      <Field.Root name="datetime" className="flex flex-col items-start gap-1">
        <Field.Label className="text-sm leading-5 font-medium text-gray-900">
          Date and time (between {format(min, 'MMM d')} and {format(max, 'MMM d, yyyy')})
        </Field.Label>
        <DateTimeField.Root
          className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue"
          min={min}
          max={max}
        >
          {(section) => (
            <DateTimeField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </DateTimeField.Root>
        <Field.Error match="rangeUnderflow" className="text-xs leading-4 text-red-600">
          Date must be on or after {format(min, 'MMM d, yyyy')}
        </Field.Error>
        <Field.Error match="rangeOverflow" className="text-xs leading-4 text-red-600">
          Date must be on or before {format(max, 'MMM d, yyyy')}
        </Field.Error>
      </Field.Root>
      <button
        type="submit"
        className="py-2 px-4 h-10 text-sm font-medium rounded-md border border-gray-200 bg-[--color-background] text-[--color-foreground] cursor-pointer whitespace-nowrap self-start hover:bg-gray-100"
      >
        Submit
      </button>
    </Form>
  );
}
