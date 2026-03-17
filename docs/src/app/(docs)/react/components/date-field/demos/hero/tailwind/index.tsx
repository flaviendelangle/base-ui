'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { DateField } from '@base-ui/react/date-field';

export default function ExampleDateField() {
  return (
    <Field.Root className="flex flex-col items-start gap-1">
      <Field.Label className="text-sm leading-5 font-medium text-gray-900">Date</Field.Label>
      <DateField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
        {(section) => (
          <DateField.Section
            key={section.index}
            className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-[oklch(45%_50%_264deg)] dark:focus:bg-[oklch(45%_40%_264deg)] focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
            section={section}
          />
        )}
      </DateField.Root>
    </Field.Root>
  );
}
