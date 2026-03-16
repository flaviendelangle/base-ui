import { screen, fireEvent } from '@mui/internal-test-utils';
import { TimeField as TimeFieldBase } from '@base-ui/react/time-field';
import {
  createRenderer,
  describeTemporalFieldInteraction,
  timeFieldDescriptor,
  adapter,
} from '#test-utils';

describeTemporalFieldInteraction(timeFieldDescriptor);

describe('<TimeField /> - TimeField-specific interactions', () => {
  const { render } = createRenderer();
  const time12Format = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;

  function TimeField(props: TimeFieldBase.Root.Props) {
    return (
      <TimeFieldBase.Root {...props} data-testid="input">
        {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
      </TimeFieldBase.Root>
    );
  }

  describe('12-hour format', () => {
    it('should display meridiem section', async () => {
      await render(
        <TimeField
          format={time12Format}
          defaultValue={adapter.date('2024-01-01T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections.length).toBe(3);
    });

    it('should toggle meridiem with ArrowUp', async () => {
      await render(
        <TimeField
          format={time12Format}
          defaultValue={adapter.date('2024-01-01T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const meridiemSection = sections[sections.length - 1];
      fireEvent.focus(meridiemSection);

      const initialValue = meridiemSection.textContent;
      fireEvent.keyDown(meridiemSection, { key: 'ArrowUp' });
      const newValue = meridiemSection.textContent;

      expect(newValue).not.toBe(initialValue);
    });
  });
});
