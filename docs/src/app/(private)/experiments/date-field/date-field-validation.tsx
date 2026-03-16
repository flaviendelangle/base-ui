'use client';
import * as React from 'react';
import { startOfDay } from 'date-fns/startOfDay';
import { subDays } from 'date-fns/subDays';
import { addDays } from 'date-fns/addDays';
import { subYears } from 'date-fns/subYears';
import { addYears } from 'date-fns/addYears';
import { format } from 'date-fns/format';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { DateField } from '@base-ui/react/date-field';
import styles from './date-field-validation.module.css';

const today = startOfDay(new Date());
const min = subDays(today, 7);
const max = addDays(today, 30);

const minLarge = subYears(today, 5);
const maxLarge = addYears(today, 5);

export default function DateFieldValidation() {
  return (
    <div>
      <h1>Date Field Validation</h1>
      <div className={styles.Page}>
        {/* Required validation */}
        <section>
          <h2>Required</h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-required-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-required-native">
                  Date (required)
                </label>
                <DateField.Root
                  id="date-required-native"
                  name="date-required-native"
                  className={styles.Root}
                  required
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-required-baseui']}`);
              }}
            >
              <Field.Root name="date-required-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>Date (required)</Field.Label>
                <DateField.Root className={styles.Root} required>
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
                <Field.Error match="valueMissing" className={styles.Error}>
                  Please select a date
                </Field.Error>
              </Field.Root>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </Form>
          </div>
        </section>

        {/* min validation */}
        <section>
          <h2>Min Date ({format(min, 'MMM d, yyyy')})</h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-min-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-min-native">
                  Date (min: {format(min, 'MMM d')})
                </label>
                <DateField.Root
                  id="date-min-native"
                  name="date-min-native"
                  className={styles.Root}
                  min={min}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-min-baseui']}`);
              }}
            >
              <Field.Root name="date-min-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>
                  Date (min: {format(min, 'MMM d')})
                </Field.Label>
                <DateField.Root className={styles.Root} min={min}>
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
                <Field.Error match="rangeUnderflow" className={styles.Error}>
                  Date must be on or after {format(min, 'MMM d, yyyy')}
                </Field.Error>
              </Field.Root>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </Form>
          </div>
        </section>

        {/* max validation */}
        <section>
          <h2>Max Date ({format(max, 'MMM d, yyyy')})</h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-max-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-max-native">
                  Date (max: {format(max, 'MMM d')})
                </label>
                <DateField.Root
                  id="date-max-native"
                  name="date-max-native"
                  className={styles.Root}
                  max={max}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-max-baseui']}`);
              }}
            >
              <Field.Root name="date-max-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>
                  Date (max: {format(max, 'MMM d')})
                </Field.Label>
                <DateField.Root className={styles.Root} max={max}>
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
                <Field.Error match="rangeOverflow" className={styles.Error}>
                  Date must be on or before {format(max, 'MMM d, yyyy')}
                </Field.Error>
              </Field.Root>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </Form>
          </div>
        </section>

        {/* min + max validation */}
        <section>
          <h2>
            Min Date ({format(min, 'MMM d, yyyy')}), Max Date ({format(max, 'MMM d, yyyy')})
          </h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-min-max-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-min-max-native">
                  Date (min: {format(min, 'MMM d')}, max: {format(max, 'MMM d')})
                </label>
                <DateField.Root
                  id="date-min-max-native"
                  name="date-min-max-native"
                  className={styles.Root}
                  min={min}
                  max={max}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-min-max-baseui']}`);
              }}
            >
              <Field.Root name="date-min-max-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>
                  Date (min: {format(min, 'MMM d')}, max: {format(max, 'MMM d')})
                </Field.Label>
                <DateField.Root className={styles.Root} min={min} max={max}>
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
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
          </div>
        </section>

        {/* min + max validation (multiple years) */}
        <section>
          <h2>
            Min Date ({format(minLarge, 'MMM d, yyyy')}), Max Date (
            {format(maxLarge, 'MMM d, yyyy')})
          </h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-min-max-large-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-min-max-large-native">
                  Date (min: {format(minLarge, 'MMM d')}, max: {format(maxLarge, 'MMM d')})
                </label>
                <DateField.Root
                  id="date-min-max-large-native"
                  name="date-min-max-large-native"
                  className={styles.Root}
                  min={minLarge}
                  max={maxLarge}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-min-max-large-baseui']}`);
              }}
            >
              <Field.Root name="date-min-max-large-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>
                  Date (min: {format(minLarge, 'MMM d')}, max: {format(maxLarge, 'MMM d')})
                </Field.Label>
                <DateField.Root
                  className={styles.Root}
                  min={minLarge}
                  max={maxLarge}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
                <Field.Error match="rangeUnderflow" className={styles.Error}>
                  Date must be on or after {format(minLarge, 'MMM d, yyyy')}
                </Field.Error>
                <Field.Error match="rangeOverflow" className={styles.Error}>
                  Date must be on or before {format(maxLarge, 'MMM d, yyyy')}
                </Field.Error>
              </Field.Root>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </Form>
          </div>
        </section>

        {/* Format with week day + min validation */}
        <section>
          <h2>Min Date ({format(min, 'MMM d, yyyy')}) when the format contains week day</h2>
          <div className={styles.DemoList}>
            {/* Native form + label */}
            <form
              className={styles.Demo}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                alert(`Submitted: ${formData.get('date-weekday-native')}`);
              }}
            >
              <div className={styles.DemoField}>
                <div className={styles.SectionTitle}>Native</div>
                <label className={styles.Label} htmlFor="date-weekday-native">
                  Date (min: {format(min, 'MMM d')})
                </label>
                <DateField.Root
                  id="date-weekday-native"
                  name="date-weekday-native"
                  className={styles.Root}
                  format="EEEE, MMM d, yyyy"
                  min={min}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
              </div>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </form>

            {/* Base UI Form + Field */}
            <Form
              className={styles.Demo}
              onFormSubmit={(formData) => {
                alert(`Submitted: ${formData['date-weekday-baseui']}`);
              }}
            >
              <Field.Root name="date-weekday-baseui" className={styles.DemoField}>
                <div className={styles.SectionTitle}>Base UI</div>
                <Field.Label className={styles.Label}>
                  Date (min: {format(min, 'MMM d')})
                </Field.Label>
                <DateField.Root
                  className={styles.Root}
                  format="EEEE, MMM d, yyyy"
                  min={min}
                >
                  {(section) => (
                    <DateField.Section
                      key={section.index}
                      className={styles.Section}
                      section={section}
                    />
                  )}
                </DateField.Root>
                <Field.Error match="rangeUnderflow" className={styles.Error}>
                  Date must be on or after {format(min, 'MMM d, yyyy')}
                </Field.Error>
              </Field.Root>
              <button type="submit" className={styles.Button}>
                Submit
              </button>
            </Form>
          </div>
        </section>
      </div>
    </div>
  );
}
