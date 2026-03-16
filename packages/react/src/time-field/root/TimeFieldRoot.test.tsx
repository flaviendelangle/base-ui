import { screen, fireEvent } from '@mui/internal-test-utils';
import { TimeField as TimeFieldBase } from '@base-ui/react/time-field';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { createRenderer, createTemporalRenderer } from '#test-utils';

describe('<TimeField /> - Field Integration', () => {
  const { render } = createRenderer();
  const { adapter } = createTemporalRenderer();
  const time24Format = `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;

  function TimeField(props: TimeFieldBase.Root.Props) {
    return (
      <TimeFieldBase.Root {...props} data-testid="input">
        {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
      </TimeFieldBase.Root>
    );
  }

  describe('Field context integration', () => {
    it('renders inside Field.Root without errors', async () => {
      await render(
        <Field.Root>
          <TimeField format={time24Format} />
        </Field.Root>,
      );

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);
    });

    it('propagates name from Field context', async () => {
      await render(
        <form data-testid="form">
          <Field.Root name="appointmentTime">
            <TimeField format={time24Format} />
          </Field.Root>
        </form>,
      );

      const form = screen.getByTestId<HTMLFormElement>('form');
      const hiddenInput = form.querySelector('input[name="appointmentTime"]') as HTMLInputElement;

      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.name).toBe('appointmentTime');
    });

    it('Field context name takes precedence over local name prop', async () => {
      await render(
        <form data-testid="form">
          <Field.Root name="fieldname">
            <TimeField format={time24Format} name="localname" />
          </Field.Root>
        </form>,
      );

      const form = screen.getByTestId<HTMLFormElement>('form');
      const hiddenInput = form.querySelector('input[tabindex="-1"]') as HTMLInputElement;

      expect(hiddenInput).not.toBe(null);
      // Field context name takes precedence (like NumberField and Checkbox)
      expect(hiddenInput.name).toBe('fieldname');
    });

    it('works without Field context (standalone mode)', async () => {
      await render(
        <TimeField
          format={time24Format}
          name="standaloneField"
          defaultValue={adapter.date('2024-03-20T09:45', 'default')}
        />,
      );

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);

      // Assert the sections display the correct values
      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(2); // hours, minutes
      expect(sections[0]).toHaveAttribute('aria-valuenow', '9'); // hours = 09
      expect(sections[1]).toHaveAttribute('aria-valuenow', '45'); // minutes = 45

      // Assert the hidden input has the correct name and value
      const hiddenInput = document.querySelector(
        'input[name="standaloneField"]',
      ) as HTMLInputElement;
      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.name).toBe('standaloneField');
      expect(hiddenInput.value).toBe('09:45');
    });
  });

  describe('Basic functionality', () => {
    it('renders with defaultValue', async () => {
      await render(
        <TimeField
          format={time24Format}
          defaultValue={adapter.date('2024-01-15T14:30', 'default')}
        />,
      );

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);

      // Assert the sections display the correct values
      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(2); // hours, minutes
      expect(sections[0]).toHaveAttribute('aria-valuenow', '14'); // hours = 14
      expect(sections[1]).toHaveAttribute('aria-valuenow', '30'); // minutes = 30

      // Assert the hidden input has the correct ISO string value
      const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.value).toBe('14:30');
    });

    it('renders with null value', async () => {
      await render(<TimeField format={time24Format} value={null} />);

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);

      // Assert the sections are empty (no aria-valuenow when empty)
      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(2); // hours, minutes
      expect(sections[0]).not.toHaveAttribute('aria-valuenow');
      expect(sections[1]).not.toHaveAttribute('aria-valuenow');

      // Assert the hidden input is empty
      const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.value).toBe('');
    });

    it('renders disabled', async () => {
      await render(<TimeField format={time24Format} disabled />);

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);

      // Assert all sections are disabled
      const sections = screen.getAllByRole('spinbutton');
      sections.forEach((section) => {
        expect(section).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('renders readOnly', async () => {
      await render(<TimeField format={time24Format} readOnly />);

      const input = screen.getByTestId('input');
      expect(input).not.toBe(null);

      // Assert all sections are readonly
      const sections = screen.getAllByRole('spinbutton');
      sections.forEach((section) => {
        expect(section).toHaveAttribute('aria-readonly', 'true');
      });
    });

    it('forwards id prop to hidden input', async () => {
      await render(<TimeField format={time24Format} id="custom-id" />);

      const hiddenInput = document.querySelector('input[id="custom-id"]') as HTMLInputElement;
      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.id).toBe('custom-id');
    });

    it('forwards inputRef to hidden input', async () => {
      const inputRef = { current: null as HTMLInputElement | null };

      await render(<TimeField format={time24Format} inputRef={inputRef} />);

      expect(inputRef.current).not.toBe(null);
      expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Component rendering with various formats', () => {
    it('should render with 24-hour format (HH:mm)', async () => {
      await render(<TimeField format={time24Format} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(2);

      // Verify sections are editable (not disabled/readonly)
      sections.forEach((section) => {
        expect(section).not.toHaveAttribute('aria-disabled', 'true');
        expect(section).not.toHaveAttribute('aria-readonly', 'true');
      });

      // Verify format matches HH:mm pattern
      expect(sections[0]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should render with 12-hour format with meridiem (hh:mm aa)', async () => {
      const time12Format = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;
      await render(<TimeField format={time12Format} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(3);

      // Verify format matches hh:mm aa pattern
      expect(sections[0]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
      expect(sections[2]).toHaveAttribute('aria-label', 'Meridiem');
    });
  });

  describe('Form submission', () => {
    it('submits the value in native time format (HH:MM) via onFormSubmit', async () => {
      const handleSubmit = vi.fn();
      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="appointmentTime">
            <TimeField
              format={time24Format}
              defaultValue={adapter.date('2024-03-20T09:30', 'default')}
            />
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(1);
      expect(handleSubmit.mock.calls[0][0].appointmentTime).toBe('09:30');
    });

    it('submits empty string when value is null', async () => {
      const handleSubmit = vi.fn();
      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="appointmentTime">
            <TimeField format={time24Format} defaultValue={null} />
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(1);
      expect(handleSubmit.mock.calls[0][0].appointmentTime).toBe('');
    });

    it('validates with rangeUnderflow when time is before minDate', async () => {
      const handleSubmit = vi.fn();
      const minDate = adapter.date('2024-03-20T09:00', 'default');

      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="time">
            <TimeField
              format={time24Format}
              defaultValue={adapter.date('2024-03-20T08:30', 'default')}
              minDate={minDate}
            />
            <Field.Error match="rangeUnderflow" data-testid="error">
              Time is too early
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('Time is too early');
    });

    it('validates with rangeOverflow when time is after maxDate', async () => {
      const handleSubmit = vi.fn();
      const maxDate = adapter.date('2024-03-20T17:00', 'default');

      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="time">
            <TimeField
              format={time24Format}
              defaultValue={adapter.date('2024-03-20T18:30', 'default')}
              maxDate={maxDate}
            />
            <Field.Error match="rangeOverflow" data-testid="error">
              Time is too late
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('Time is too late');
    });
  });

  describe('Controlled value updates', () => {
    it('should update displayed sections when value prop changes', async () => {
      const { setProps } = await render(
        <TimeField format={time24Format} value={adapter.date('2024-01-15T09:30', 'default')} />,
      );

      let sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuenow', '9');
      expect(sections[1]).toHaveAttribute('aria-valuenow', '30');

      await setProps({ value: adapter.date('2024-01-15T14:45', 'default') });

      sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuenow', '14');
      expect(sections[1]).toHaveAttribute('aria-valuenow', '45');
    });

    it('should update hidden input when value prop changes', async () => {
      const { setProps } = await render(
        <TimeField format={time24Format} value={adapter.date('2024-01-15T09:30', 'default')} />,
      );

      let hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput.value).toBe('09:30');

      await setProps({ value: adapter.date('2024-01-15T14:45', 'default') });

      hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput.value).toBe('14:45');
    });
  });

  describe('Form validation - required', () => {
    it('should show valueMissing error when required and empty', async () => {
      const handleSubmit = vi.fn();
      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="time">
            <TimeField format={time24Format} required />
            <Field.Error match="valueMissing" data-testid="error">
              Time is required
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('Time is required');
    });

    it('should not show valueMissing error when required and filled', async () => {
      const handleSubmit = vi.fn();
      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="time">
            <TimeField
              format={time24Format}
              required
              defaultValue={adapter.date('2024-03-15T14:30', 'default')}
            />
            <Field.Error match="valueMissing" data-testid="error">
              Time is required
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
    it('should set type="time" on hidden input', async () => {
      await render(<TimeField format={time24Format} />);

      const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput.type).toBe('time');
    });

    it('should set min attribute when minDate is provided', async () => {
      await render(
        <TimeField format={time24Format} minDate={adapter.date('2024-01-01T09:00', 'default')} />,
      );

      const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput.min).toBe('09:00:00');
    });

    it('should set max attribute when maxDate is provided', async () => {
      await render(
        <TimeField format={time24Format} maxDate={adapter.date('2024-01-01T17:00', 'default')} />,
      );

      const hiddenInput = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(hiddenInput.max).toBe('17:00:00');
    });
  });

  describe('12-hour format with meridiem', () => {
    const time12Format = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;

    it('should render 3 sections with meridiem', async () => {
      await render(
        <TimeField
          format={time12Format}
          defaultValue={adapter.date('2024-01-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(3);
      expect(sections[0]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
      expect(sections[2]).toHaveAttribute('aria-label', 'Meridiem');
    });

    it('should display PM for afternoon times', async () => {
      await render(
        <TimeField
          format={time12Format}
          defaultValue={adapter.date('2024-01-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuenow', '2'); // 2 PM
      expect(sections[1]).toHaveAttribute('aria-valuenow', '30');
    });

    it('should display AM for morning times', async () => {
      await render(
        <TimeField
          format={time12Format}
          defaultValue={adapter.date('2024-01-15T09:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuenow', '9');
      expect(sections[1]).toHaveAttribute('aria-valuenow', '30');
    });
  });

  describe('Seconds format', () => {
    it('should render hours, minutes, and seconds when format includes seconds', async () => {
      const timeWithSecondsFormat = `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}:${adapter.formats.secondsPadded}`;
      await render(
        <TimeField
          format={timeWithSecondsFormat}
          defaultValue={adapter.date('2024-01-15T14:30:45', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections).toHaveLength(3);
      expect(sections[0]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
      expect(sections[2]).toHaveAttribute('aria-label', 'Seconds');
    });
  });
});
