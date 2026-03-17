'use client';
import * as React from 'react';
import { fr } from 'date-fns/locale/fr';
import { Field } from '@base-ui/react/field';
import { TimeField } from '@base-ui/react/time-field';
import { LocalizationProvider } from '@base-ui/react/localization-provider';

export default function ExampleTimeFieldLocalization() {
  return (
    <div className="flex flex-col gap-4">
      <LocalizationProvider temporalLocale={fr}>
        <Field.Root className="flex flex-col items-start gap-1">
          <Field.Label className="text-sm leading-5 font-medium text-gray-900">
            French locale (24h clock by default)
          </Field.Label>
          <TimeField.Root className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue">
            {(section) => (
              <TimeField.Section
                key={section.index}
                className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
                section={section}
              />
            )}
          </TimeField.Root>
        </Field.Root>
      </LocalizationProvider>
      <LocalizationProvider
        translations={{
          temporalFieldHoursPlaceholder: () => 'hh',
          temporalFieldMinutesPlaceholder: () => 'mm',
          temporalFieldMeridiemPlaceholder: () => 'AM',
        }}
      >
        <Field.Root className="flex flex-col items-start gap-1">
          <Field.Label className="text-sm leading-5 font-medium text-gray-900">
            Custom placeholders
          </Field.Label>
          <TimeField.Root
            className="box-border flex items-center border border-gray-200 px-2 h-10 text-base rounded-md text-gray-900 outline-none focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue"
            ampm
          >
            {(section) => (
              <TimeField.Section
                key={section.index}
                className="outline-none font-[monospace] rounded px-1 caret-transparent [&::selection]:bg-transparent focus:bg-blue focus:text-white data-[separator]:px-0 data-[empty]:text-gray-700"
                section={section}
              />
            )}
          </TimeField.Root>
        </Field.Root>
      </LocalizationProvider>
    </div>
  );
}
