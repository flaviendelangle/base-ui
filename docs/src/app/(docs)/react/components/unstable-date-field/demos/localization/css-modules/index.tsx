'use client';
import * as React from 'react';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { Field } from '@base-ui/react/field';
import { DateField } from '@base-ui/react/date-field';
import { TemporalFieldPlaceholderGetters } from '@base-ui/react/types';
import { LocalizationProvider } from '@base-ui/react/localization-provider';
import fieldStyles from '../../date-field.module.css';
import styles from './index.module.css';

const FRENCH_PLACEHOLDER_GETTERS: Partial<TemporalFieldPlaceholderGetters> = {
  year: (params) => 'A'.repeat(params.digitAmount),
  day: () => 'JJ',
};

const GERMAN_PLACEHOLDER_GETTERS: Partial<TemporalFieldPlaceholderGetters> = {
  year: (params) => 'J'.repeat(params.digitAmount),
  day: () => 'TT',
};

export default function ExampleDateFieldLocalization() {
  return (
    <div className={styles.Wrapper}>
      <LocalizationProvider temporalLocale={fr}>
        <Field.Root className={fieldStyles.Field}>
          <Field.Label className={fieldStyles.Label}>French locale</Field.Label>
          <DateField.Root
            className={fieldStyles.Root}
            placeholderGetters={FRENCH_PLACEHOLDER_GETTERS}
          >
            {(section) => (
              <DateField.Section
                key={section.index}
                className={fieldStyles.Section}
                section={section}
              />
            )}
          </DateField.Root>
        </Field.Root>
      </LocalizationProvider>
      <LocalizationProvider temporalLocale={de}>
        <Field.Root className={fieldStyles.Field}>
          <Field.Label className={fieldStyles.Label}>German locale</Field.Label>
          <DateField.Root
            className={fieldStyles.Root}
            placeholderGetters={GERMAN_PLACEHOLDER_GETTERS}
          >
            {(section) => (
              <DateField.Section
                key={section.index}
                className={fieldStyles.Section}
                section={section}
              />
            )}
          </DateField.Root>
        </Field.Root>
      </LocalizationProvider>
    </div>
  );
}
