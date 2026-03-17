'use client';
import * as React from 'react';
import { DateField } from '@base-ui/react/date-field';
import fieldStyles from '../../date-field.module.css';
import styles from './index.module.css';

export default function ExampleDateFieldCustomFormat() {
  return (
    <div className={styles.Wrapper}>
      <div className={fieldStyles.Field}>
        <label className={fieldStyles.Label}>Default (numeric)</label>
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
      <div className={fieldStyles.Field}>
        <label className={fieldStyles.Label}>With weekday</label>
        <DateField.Root className={fieldStyles.Root} format="EEEE, MMMM dd, yyyy">
          {(section) => (
            <DateField.Section
              key={section.index}
              className={fieldStyles.Section}
              section={section}
            />
          )}
        </DateField.Root>
      </div>
      <div className={fieldStyles.Field}>
        <label className={fieldStyles.Label}>ISO format</label>
        <DateField.Root className={fieldStyles.Root} format="yyyy-MM-dd">
          {(section) => (
            <DateField.Section
              key={section.index}
              className={fieldStyles.Section}
              section={section}
            />
          )}
        </DateField.Root>
      </div>
    </div>
  );
}
