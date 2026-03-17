'use client';
import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { TimeField } from '@base-ui/react/time-field';

export default function ExampleTimeFieldClearButton() {
  return (
    <Field.Root className="flex flex-col items-start gap-1">
      <Field.Label className="text-sm leading-5 font-medium text-gray-900">Time</Field.Label>
      <TimeField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
        <TimeField.SectionList>
          {(section) => (
            <TimeField.Section
              key={section.index}
              className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
              section={section}
            />
          )}
        </TimeField.SectionList>
        <TimeField.Clear className="ml-auto bg-transparent border-0 cursor-pointer text-gray-600 px-1.5 text-lg leading-none flex items-center hover:text-gray-700 data-[disabled]:cursor-not-allowed data-[disabled]:text-gray-300 data-[empty]:invisible">
          {'\u2715'}
        </TimeField.Clear>
      </TimeField.Root>
    </Field.Root>
  );
}
