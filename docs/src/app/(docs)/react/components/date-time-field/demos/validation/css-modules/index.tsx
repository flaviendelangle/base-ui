'use client';
import * as React from 'react';
import { format } from 'date-fns/format';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { DateTimeField } from '@base-ui/react/date-time-field';
import fieldStyles from '../../date-time-field.module.css';
import styles from './index.module.css';

const min = new Date(2026, 2, 10);
const max = new Date(2026, 2, 24);

export default function ExampleDateTimeFieldValidation() {
  return (
    <Form
      className={styles.Form}
      onFormSubmit={(formData) => {
        // eslint-disable-next-line no-alert
        alert(`Submitted: ${formData.datetime}`);
      }}
    >
      <Field.Root name="datetime" className={fieldStyles.Field}>
        <Field.Label className={fieldStyles.Label}>
          Date and time (between {format(min, 'MMM d')} and {format(max, 'MMM d, yyyy')})
        </Field.Label>
        <DateTimeField.Root className={fieldStyles.Root} min={min} max={max}>
          {(section) => (
            <DateTimeField.Section
              key={section.index}
              className={fieldStyles.Section}
              section={section}
            />
          )}
        </DateTimeField.Root>
        <Field.Error match="rangeUnderflow" className={styles.Error}>
          Date must be on or after {format(min, 'MMM d, yyyy')}
        </Field.Error>
        <Field.Error match="rangeOverflow" className={styles.Error}>
          Date must be on or before {format(max, 'MMM d, yyyy')}
        </Field.Error>
      </Field.Root>
      <button type="submit" className={styles.Button}>
        Submit
      </button>
    </Form>
  );
}
