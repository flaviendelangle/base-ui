import { screen } from '@mui/internal-test-utils';
import { TimeField as TimeFieldBase } from '@base-ui/react/time-field';
import {
  createRenderer,
  describeTemporalFieldRoot,
  timeFieldDescriptor,
  adapter,
} from '#test-utils';

describeTemporalFieldRoot(timeFieldDescriptor);

describe('<TimeField /> - TimeField-specific', () => {
  const { render } = createRenderer();

  describe('12-hour format with meridiem', () => {
    const time12Format = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;

    function TimeField(props: TimeFieldBase.Root.Props) {
      return (
        <TimeFieldBase.Root {...props} data-testid="input">
          {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
        </TimeFieldBase.Root>
      );
    }

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
    function TimeField(props: TimeFieldBase.Root.Props) {
      return (
        <TimeFieldBase.Root {...props} data-testid="input">
          {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
        </TimeFieldBase.Root>
      );
    }

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
