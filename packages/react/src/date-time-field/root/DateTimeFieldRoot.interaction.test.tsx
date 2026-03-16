import { screen, fireEvent } from '@mui/internal-test-utils';
import { DateTimeField as DateTimeFieldBase } from '@base-ui/react/date-time-field';
import { createRenderer } from '#test-utils';
import {
  describeTemporalFieldInteraction,
} from '../../date-field/utils/temporalFieldRoot.shared-interaction-tests';
import {
  dateTimeFieldDescriptor,
  adapter,
} from '../../date-field/utils/temporalField.test-descriptors';

describeTemporalFieldInteraction(dateTimeFieldDescriptor);

describe('<DateTimeField /> - DateTimeField-specific interactions', () => {
  const { render } = createRenderer();
  const dateTimeFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded} ${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;

  function DateTimeField(props: DateTimeFieldBase.Root.Props) {
    return (
      <DateTimeFieldBase.Root {...props} data-testid="input">
        {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
      </DateTimeFieldBase.Root>
    );
  }

  describe('Cross-section navigation', () => {
    it('should navigate across all sections with ArrowRight', async () => {
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      fireEvent.focus(sections[0]);

      for (let i = 0; i < sections.length - 1; i += 1) {
        fireEvent.keyDown(sections[i], { key: 'ArrowRight' });
      }

      const lastSection = sections[sections.length - 1];
      fireEvent.keyDown(lastSection, { key: 'ArrowUp' });
      expect(lastSection).toHaveAttribute('aria-valuenow', '31'); // minutes: 30 -> 31
    });

    it('should navigate from time section back to date section with ArrowLeft', async () => {
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours')!;
      const yearSection = sections.find((s) => s.getAttribute('aria-label') === 'Year')!;

      fireEvent.focus(hoursSection);
      fireEvent.keyDown(hoursSection, { key: 'ArrowLeft' });

      fireEvent.keyDown(yearSection, { key: 'ArrowUp' });
      expect(yearSection).toHaveAttribute('aria-valuenow', '2025');
    });
  });
});
