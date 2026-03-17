'use client';
import * as React from 'react';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { Field } from '@base-ui/react/field';
import { DateTimeField } from '@base-ui/react/date-time-field';
import { LocalizationProvider } from '@base-ui/react/localization-provider';

export default function ExampleDateTimeFieldLocalization() {
  return (
    <div className="flex flex-col gap-4">
      <LocalizationProvider
        temporalLocale={fr}
        translations={{
          temporalFieldYearPlaceholder: ({ digitAmount }) => 'A'.repeat(digitAmount),
          temporalFieldDayPlaceholder: () => 'JJ',
        }}
      >
        <Field.Root className="flex flex-col items-start gap-1">
          <Field.Label className="text-sm leading-5 font-medium text-gray-900">
            French locale
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
      </LocalizationProvider>
      <LocalizationProvider
        temporalLocale={de}
        translations={{
          temporalFieldYearPlaceholder: ({ digitAmount }) => 'J'.repeat(digitAmount),
          temporalFieldDayPlaceholder: () => 'TT',
        }}
      >
        <Field.Root className="flex flex-col items-start gap-1">
          <Field.Label className="text-sm leading-5 font-medium text-gray-900">
            German locale
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
      </LocalizationProvider>
    </div>
  );
}
