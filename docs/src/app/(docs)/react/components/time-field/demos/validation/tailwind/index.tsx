'use client';
import * as React from 'react';
import { format } from 'date-fns/format';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { TimeField } from '@base-ui/react/time-field';

const min = new Date(2026, 0, 1, 9, 0, 0);
const max = new Date(2026, 0, 1, 17, 30, 0);

export default function ExampleTimeFieldValidation() {
  return (
    <Form
      className="flex flex-col gap-2 max-w-96"
      onFormSubmit={(formData) => {
        // eslint-disable-next-line no-alert
        alert(`Submitted: ${formData.time}`);
      }}
    >
      <Field.Root name="time" className="flex flex-col items-start gap-1">
        <Field.Label className="text-sm leading-5 font-medium text-gray-900">
          Time (between {format(min, 'h:mm a')} and {format(max, 'h:mm a')})
        </Field.Label>
        <TimeField.Root
          className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue"
          min={min}
          max={max}
        >
          {(section) => (
            <TimeField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent focus:[&::selection]:bg-[oklch(45%_50%_264deg)] dark:focus:[&::selection]:bg-[oklch(45%_40%_264deg)] focus:[&::selection]:text-white focus:bg-[oklch(45%_50%_264deg)] dark:focus:bg-[oklch(45%_40%_264deg)] focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </TimeField.Root>
        <Field.Error match="rangeUnderflow" className="text-xs leading-4 text-red-600">
          Time must be on or after {format(min, 'h:mm a')}
        </Field.Error>
        <Field.Error match="rangeOverflow" className="text-xs leading-4 text-red-600">
          Time must be on or before {format(max, 'h:mm a')}
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
