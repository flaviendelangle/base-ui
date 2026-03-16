import { screen, fireEvent, waitFor } from '@mui/internal-test-utils';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { createRenderer, isJSDOM } from '#test-utils';
import { TemporalFieldTestDescriptor, adapter } from './temporalField.test-descriptors';

export function describeTemporalFieldRoot(descriptor: TemporalFieldTestDescriptor) {
  const {
    name,
    Field: FieldComponent,
    defaultFormat,
    defaultValueISO,
    updatedValueISO,
    expectedSectionCount,
    expectedSectionLabels,
    hiddenInputType,
    expectedHiddenValue,
    expectedUpdatedHiddenValue,
    fieldName,
    minValueISO,
    maxValueISO,
    expectedMinHidden,
    expectedMaxHidden,
    expectedSectionValues,
    expectedUpdatedSectionValues,
    underflowError,
    overflowError,
    missingError,
    valueBelowMinISO,
    valueAboveMaxISO,
  } = descriptor;

  describe(`<${name} /> - Field Integration`, () => {
    const { render } = createRenderer();

    describe('Field context integration', () => {
      it('renders inside Field.Root without errors', async () => {
        await render(
          <Field.Root>
            <FieldComponent format={defaultFormat} />
          </Field.Root>,
        );

        expect(screen.getByTestId('input')).not.toBe(null);
      });

      it('propagates name from Field context', async () => {
        await render(
          <form data-testid="form">
            <Field.Root name={fieldName}>
              <FieldComponent format={defaultFormat} />
            </Field.Root>
          </form>,
        );

        const form = screen.getByTestId<HTMLFormElement>('form');
        const hiddenInput = form.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.name).toBe(fieldName);
      });

      it('Field context name takes precedence over local name prop', async () => {
        await render(
          <form data-testid="form">
            <Field.Root name="fieldname">
              <FieldComponent format={defaultFormat} name="localname" />
            </Field.Root>
          </form>,
        );

        const form = screen.getByTestId<HTMLFormElement>('form');
        const hiddenInput = form.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.name).toBe('fieldname');
      });

      it('works without Field context (standalone mode)', async () => {
        await render(
          <FieldComponent
            format={defaultFormat}
            name="standaloneField"
            defaultValue={adapter.date(defaultValueISO, 'default')}
          />,
        );

        expect(screen.getByTestId('input')).not.toBe(null);

        const sections = screen.getAllByRole('spinbutton');
        expect(sections).toHaveLength(expectedSectionCount);
        for (const [label, value] of Object.entries(expectedSectionValues)) {
          const section = sections.find((s) => s.getAttribute('aria-label') === label);
          expect(section).toHaveAttribute('aria-valuenow', value);
        }

        const hiddenInput = document.querySelector(
          'input[name="standaloneField"]',
        ) as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.name).toBe('standaloneField');
        expect(hiddenInput.value).toBe(expectedHiddenValue);
      });
    });

    describe('Basic functionality', () => {
      it('renders with defaultValue', async () => {
        await render(
          <FieldComponent
            format={defaultFormat}
            defaultValue={adapter.date(defaultValueISO, 'default')}
          />,
        );

        expect(screen.getByTestId('input')).not.toBe(null);

        const sections = screen.getAllByRole('spinbutton');
        expect(sections).toHaveLength(expectedSectionCount);
        for (const [label, value] of Object.entries(expectedSectionValues)) {
          const section = sections.find((s) => s.getAttribute('aria-label') === label);
          expect(section).toHaveAttribute('aria-valuenow', value);
        }

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.value).toBe(expectedHiddenValue);
      });

      it('renders with null value', async () => {
        await render(<FieldComponent format={defaultFormat} value={null} />);

        expect(screen.getByTestId('input')).not.toBe(null);

        const sections = screen.getAllByRole('spinbutton');
        expect(sections).toHaveLength(expectedSectionCount);
        sections.forEach((section) => {
          expect(section).not.toHaveAttribute('aria-valuenow');
        });

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.value).toBe('');
      });

      it('renders disabled', async () => {
        await render(<FieldComponent format={defaultFormat} disabled />);

        const sections = screen.getAllByRole('spinbutton');
        sections.forEach((section) => {
          expect(section).toHaveAttribute('aria-disabled', 'true');
        });
      });

      it('renders readOnly', async () => {
        await render(<FieldComponent format={defaultFormat} readOnly />);

        const sections = screen.getAllByRole('spinbutton');
        sections.forEach((section) => {
          expect(section).toHaveAttribute('aria-readonly', 'true');
        });
      });

      it('forwards id prop to hidden input', async () => {
        await render(<FieldComponent format={defaultFormat} id="custom-id" />);

        const hiddenInput = document.querySelector('input[id="custom-id"]') as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.id).toBe('custom-id');
      });

      it('forwards inputRef to hidden input', async () => {
        const inputRef = { current: null as HTMLInputElement | null };
        await render(<FieldComponent format={defaultFormat} inputRef={inputRef} />);

        expect(inputRef.current).not.toBe(null);
        expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
      });
    });

    describe('Component rendering with various formats', () => {
      it('should render with the default format', async () => {
        await render(<FieldComponent format={defaultFormat} />);

        const sections = screen.getAllByRole('spinbutton');
        expect(sections).toHaveLength(expectedSectionCount);

        sections.forEach((section) => {
          expect(section).not.toHaveAttribute('aria-disabled', 'true');
          expect(section).not.toHaveAttribute('aria-readonly', 'true');
        });

        expectedSectionLabels.forEach((label) => {
          const section = sections.find((s) => s.getAttribute('aria-label') === label);
          expect(section).not.toBe(undefined);
        });
      });

      it('should accept value through controlled prop', async () => {
        const testDate = adapter.date(defaultValueISO, 'default');
        await render(<FieldComponent format={defaultFormat} value={testDate} />);

        const sections = screen.getAllByRole('spinbutton');
        for (const [label, value] of Object.entries(expectedSectionValues)) {
          const section = sections.find((s) => s.getAttribute('aria-label') === label);
          expect(section).toHaveAttribute('aria-valuenow', value);
        }

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput).not.toBe(null);
        expect(hiddenInput.value).toBe(expectedHiddenValue);
      });
    });

    describe('Form submission', () => {
      it('submits the value via onFormSubmit', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name={fieldName}>
              <FieldComponent
                format={defaultFormat}
                defaultValue={adapter.date(defaultValueISO, 'default')}
              />
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(1);
        expect(handleSubmit.mock.calls[0][0][fieldName]).toBe(expectedHiddenValue);
      });

      it('submits empty string when value is null', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name={fieldName}>
              <FieldComponent format={defaultFormat} defaultValue={null} />
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(1);
        expect(handleSubmit.mock.calls[0][0][fieldName]).toBe('');
      });

      it('validates with rangeUnderflow when value is before min', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="field">
              <FieldComponent
                format={defaultFormat}
                defaultValue={adapter.date(valueBelowMinISO, 'default')}
                min={adapter.date(minValueISO, 'default')}
              />
              <Field.Error match="rangeUnderflow" data-testid="error">
                {underflowError}
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(0);
        expect(screen.getByTestId('error')).toHaveTextContent(underflowError);
      });

      it('validates with rangeOverflow when value is after max', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="field">
              <FieldComponent
                format={defaultFormat}
                defaultValue={adapter.date(valueAboveMaxISO, 'default')}
                max={adapter.date(maxValueISO, 'default')}
              />
              <Field.Error match="rangeOverflow" data-testid="error">
                {overflowError}
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(0);
        expect(screen.getByTestId('error')).toHaveTextContent(overflowError);
      });
    });

    describe('Controlled value updates', () => {
      it('should update displayed sections when value prop changes', async () => {
        const { setProps } = await render(
          <FieldComponent
            format={defaultFormat}
            value={adapter.date(defaultValueISO, 'default')}
          />,
        );

        await setProps({ value: adapter.date(updatedValueISO, 'default') });

        const sections = screen.getAllByRole('spinbutton');
        for (const [label, value] of Object.entries(expectedUpdatedSectionValues)) {
          const section = sections.find((s) => s.getAttribute('aria-label') === label);
          expect(section).toHaveAttribute('aria-valuenow', value);
        }
      });

      it('should update hidden input when value prop changes', async () => {
        const { setProps } = await render(
          <FieldComponent
            format={defaultFormat}
            value={adapter.date(defaultValueISO, 'default')}
          />,
        );

        let hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput.value).toBe(expectedHiddenValue);

        await setProps({ value: adapter.date(updatedValueISO, 'default') });

        hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput.value).toBe(expectedUpdatedHiddenValue);
      });
    });

    describe('Form validation - required', () => {
      it('should show valueMissing error when required and empty', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="field">
              <FieldComponent format={defaultFormat} required />
              <Field.Error match="valueMissing" data-testid="error">
                {missingError}
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(0);
        expect(screen.getByTestId('error')).toHaveTextContent(missingError);
      });

      it('should not show valueMissing error when required and filled', async () => {
        const handleSubmit = vi.fn();
        await render(
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name="field">
              <FieldComponent
                format={defaultFormat}
                required
                defaultValue={adapter.date(defaultValueISO, 'default')}
              />
              <Field.Error match="valueMissing" data-testid="error">
                {missingError}
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls.length).toBe(1);
        expect(screen.queryByTestId('error')).toBe(null);
      });
    });

    describe('Hidden input attributes', () => {
      it(`should set type="${hiddenInputType}" on hidden input`, async () => {
        await render(<FieldComponent format={defaultFormat} />);

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput.type).toBe(hiddenInputType);
      });

      it('should set min attribute when min is provided', async () => {
        await render(
          <FieldComponent format={defaultFormat} min={adapter.date(minValueISO, 'default')} />,
        );

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput.min).toBe(expectedMinHidden);
      });

      it('should set max attribute when max is provided', async () => {
        await render(
          <FieldComponent format={defaultFormat} max={adapter.date(maxValueISO, 'default')} />,
        );

        const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
        expect(hiddenInput.max).toBe(expectedMaxHidden);
      });
    });

    describe('Accessibility', () => {
      it('should have role="group" on root element', async () => {
        await render(<FieldComponent format={defaultFormat} />);

        expect(screen.getByTestId('input')).toHaveAttribute('role', 'group');
      });

      it.skipIf(isJSDOM)(
        'should set aria-invalid on spinbutton sections when field is invalid',
        async () => {
          const { user } = await render(
            <Form>
              <Field.Root name="field">
                <FieldComponent format={defaultFormat} required />
                <Field.Error match="valueMissing" data-testid="error">
                  {missingError}
                </Field.Error>
              </Field.Root>
              <button type="submit" data-testid="submit">
                Submit
              </button>
            </Form>,
          );

          const sections = screen.getAllByRole('spinbutton');
          expect(sections[0]).not.toHaveAttribute('aria-invalid');

          await user.click(screen.getByTestId('submit'));

          await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent(missingError);
            for (const section of screen.getAllByRole('spinbutton')) {
              expect(section).toHaveAttribute('aria-invalid', 'true');
            }
          });
        },
      );

      it('should set aria-required on spinbutton sections when field is required', async () => {
        await render(<FieldComponent format={defaultFormat} required />);

        for (const section of screen.getAllByRole('spinbutton')) {
          expect(section).toHaveAttribute('aria-required', 'true');
        }
      });

      it('should not set aria-required on spinbutton sections when field is not required', async () => {
        await render(<FieldComponent format={defaultFormat} />);

        for (const section of screen.getAllByRole('spinbutton')) {
          expect(section).not.toHaveAttribute('aria-required');
        }
      });

      it('should have aria-describedby linking to Field.Error when error is shown', async () => {
        await render(
          <Form>
            <Field.Root name="field">
              <FieldComponent format={defaultFormat} required />
              <Field.Error match="valueMissing" data-testid="error">
                {missingError}
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>,
        );

        fireEvent.click(screen.getByText('Submit'));

        const input = screen.getByTestId('input');
        const error = screen.getByTestId('error');
        expect(input).toHaveAttribute('aria-describedby');
        expect(input.getAttribute('aria-describedby')).toContain(error.id);
      });
    });
  });
}
