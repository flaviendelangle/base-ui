'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { DateField } from '@base-ui/react/date-field';

export default function ExampleDateFieldClearButton() {
  return (
    <Field.Root className="flex flex-col items-start gap-1">
      <Field.Label className="text-sm leading-5 font-medium text-gray-900">Date</Field.Label>
      <DateField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
        <DateField.SectionList>
          {(section) => (
            <DateField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </DateField.SectionList>
        <DateField.Clear className="ml-auto bg-transparent border-0 cursor-pointer text-gray-600 px-1.5 text-lg leading-none flex items-center hover:text-gray-700 data-[disabled]:cursor-not-allowed data-[disabled]:text-gray-300 data-[empty]:invisible">
          {'\u2715'}
        </DateField.Clear>
      </DateField.Root>
    </Field.Root>
  );
}
