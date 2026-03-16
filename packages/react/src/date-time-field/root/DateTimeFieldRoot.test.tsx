import { screen, fireEvent } from '@mui/internal-test-utils';
import { DateTimeField as DateTimeFieldBase } from '@base-ui/react/date-time-field';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import {
  createRenderer,
  describeTemporalFieldRoot,
  dateTimeFieldDescriptor,
  adapter,
} from '#test-utils';

describeTemporalFieldRoot(dateTimeFieldDescriptor);

describe('<DateTimeField /> - DateTimeField-specific', () => {
  const { render } = createRenderer();

  function DateTimeField(props: DateTimeFieldBase.Root.Props) {
    return (
      <DateTimeFieldBase.Root {...props} data-testid="input">
        {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
      </DateTimeFieldBase.Root>
    );
  }

  describe('12-hour format with meridiem', () => {
    const dateTime12Format = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded} ${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;

    it('should render with meridiem section', async () => {
      await render(
        <DateTimeField
          format={dateTime12Format}
          defaultValue={adapter.date('2024-01-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const meridiemSection = sections.find((s) => s.getAttribute('aria-label') === 'Meridiem');
      expect(meridiemSection).not.toBe(undefined);
    });

    it('should display PM for afternoon times', async () => {
      await render(
        <DateTimeField
          format={dateTime12Format}
          defaultValue={adapter.date('2024-01-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
      expect(hoursSection).toHaveAttribute('aria-valuenow', '2'); // 2 PM
    });

    it('should display AM for morning times', async () => {
      await render(
        <DateTimeField
          format={dateTime12Format}
          defaultValue={adapter.date('2024-01-15T09:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
      expect(hoursSection).toHaveAttribute('aria-valuenow', '9');
    });
  });

  describe('Seconds format', () => {
    it('should render hours, minutes, and seconds when format includes seconds', async () => {
      const dateTimeWithSecondsFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded} ${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}:${adapter.formats.secondsPadded}`;
      await render(
        <DateTimeField
          format={dateTimeWithSecondsFormat}
          defaultValue={adapter.date('2024-01-15T14:30:45', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const secondsSection = sections.find((s) => s.getAttribute('aria-label') === 'Seconds');
      expect(secondsSection).not.toBe(undefined);
    });
  });

  describe('DateTime-specific validation', () => {
    it('validates with rangeUnderflow when datetime is before min (same date, earlier time)', async () => {
      const handleSubmit = vi.fn();
      const min = adapter.date('2024-03-20T09:00', 'default');

      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="datetime">
            <DateTimeField
              format={dateTimeFieldDescriptor.defaultFormat}
              defaultValue={adapter.date('2024-03-20T08:30', 'default')}
              min={min}
            />
            <Field.Error match="rangeUnderflow" data-testid="error">
              DateTime is too early
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('DateTime is too early');
    });

    it('validates with rangeOverflow when datetime is after max (same date, later time)', async () => {
      const handleSubmit = vi.fn();
      const max = adapter.date('2024-03-20T17:00', 'default');

      await render(
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="datetime">
            <DateTimeField
              format={dateTimeFieldDescriptor.defaultFormat}
              defaultValue={adapter.date('2024-03-20T18:30', 'default')}
              max={max}
            />
            <Field.Error match="rangeOverflow" data-testid="error">
              DateTime is too late
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );

      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('DateTime is too late');
    });
  });
});
