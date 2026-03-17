'use client';
import * as React from 'react';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { DateField } from '@base-ui/react/date-field';
import { LocalizationProvider } from '@base-ui/react/localization-provider';
import fieldStyles from '../../date-field.module.css';
import styles from './index.module.css';

export default function ExampleDateFieldLocalization() {
  return (
    <div className={styles.Wrapper}>
      <LocalizationProvider
        temporalLocale={fr}
        translations={{
          temporalFieldYearPlaceholder: ({ digitAmount }) => 'A'.repeat(digitAmount),
          temporalFieldDayPlaceholder: () => 'JJ',
        }}
      >
        <div className={fieldStyles.Field}>
          <label className={fieldStyles.Label}>French locale</label>
          <DateField.Root className={fieldStyles.Root}>
            {(section) => (
              <DateField.Section
                key={section.index}
                className={fieldStyles.Section}
                section={section}
              />
            )}
          </DateField.Root>
        </div>
      </LocalizationProvider>
      <LocalizationProvider
        temporalLocale={de}
        translations={{
          temporalFieldYearPlaceholder: ({ digitAmount }) => 'J'.repeat(digitAmount),
          temporalFieldDayPlaceholder: () => 'TT',
        }}
      >
        <div className={fieldStyles.Field}>
          <label className={fieldStyles.Label}>German locale</label>
          <DateField.Root className={fieldStyles.Root}>
            {(section) => (
              <DateField.Section
                key={section.index}
                className={fieldStyles.Section}
                section={section}
              />
            )}
          </DateField.Root>
        </div>
      </LocalizationProvider>
    </div>
  );
}
