'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { DateField } from '@base-ui/react/date-field';

export default function ExampleDateFieldCustomFormat() {
  return (
    <div className="flex flex-col gap-4">
      <Field.Root className="flex flex-col items-start gap-1">
        <Field.Label className="text-sm leading-5 font-medium text-gray-900">
          Default (numeric)
        </Field.Label>
        <DateField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
          {(section) => (
            <DateField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </DateField.Root>
      </Field.Root>
      <Field.Root className="flex flex-col items-start gap-1">
        <Field.Label className="text-sm leading-5 font-medium text-gray-900">
          With weekday
        </Field.Label>
        <DateField.Root
          className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue"
          format="EEEE, MMMM dd, yyyy"
        >
          {(section) => (
            <DateField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </DateField.Root>
      </Field.Root>
      <Field.Root className="flex flex-col items-start gap-1">
        <Field.Label className="text-sm leading-5 font-medium text-gray-900">
          ISO format
        </Field.Label>
        <DateField.Root
          className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue"
          format="yyyy-MM-dd"
        >
          {(section) => (
            <DateField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </DateField.Root>
      </Field.Root>
    </div>
  );
}
