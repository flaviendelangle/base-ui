'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { DateTimeField } from '@base-ui/react/date-time-field';

export default function ExampleDateTimeField() {
  return (
    <Field.Root className="flex flex-col items-start gap-1">
      <Field.Label className="text-sm leading-5 font-medium text-gray-900">
        Date and time
      </Field.Label>
      <DateTimeField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
        {(section) => (
          <DateTimeField.Section
            key={section.index}
            className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
            section={section}
          />
        )}
      </DateTimeField.Root>
    </Field.Root>
  );
}
