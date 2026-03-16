import { screen, fireEvent } from '@mui/internal-test-utils';
import { DateTimeField as DateTimeFieldBase } from '@base-ui/react/date-time-field';
import { createRenderer, createTemporalRenderer } from '#test-utils';

describe('<DateTimeField /> - DOM Interactions', () => {
  const { render } = createRenderer();
  const { adapter } = createTemporalRenderer();
  const dateTimeFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded} ${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;

  function DateTimeField(props: DateTimeFieldBase.Root.Props) {
    return (
      <DateTimeFieldBase.Root {...props} data-testid="input">
        {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
      </DateTimeFieldBase.Root>
    );
  }

  describe('Keyboard navigation', () => {
    describe('ArrowUp / ArrowDown (value adjustment)', () => {
      it('should increment month section value on ArrowUp', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
        expect(monthSection).not.toBe(undefined);

        fireEvent.focus(monthSection!);
        fireEvent.keyDown(monthSection!, { key: 'ArrowUp' });

        expect(monthSection).toHaveAttribute('aria-valuenow', '4'); // March -> April
      });

      it('should decrement month section value on ArrowDown', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
        expect(monthSection).not.toBe(undefined);

        fireEvent.focus(monthSection!);
        fireEvent.keyDown(monthSection!, { key: 'ArrowDown' });

        expect(monthSection).toHaveAttribute('aria-valuenow', '2'); // March -> February
      });

      it('should wrap month from December to January on ArrowUp', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-12-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
        expect(monthSection).not.toBe(undefined);

        fireEvent.focus(monthSection!);
        fireEvent.keyDown(monthSection!, { key: 'ArrowUp' });

        expect(monthSection).toHaveAttribute('aria-valuenow', '1'); // December -> January
      });

      it('should increment hours section value on ArrowUp', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
        expect(hoursSection).not.toBe(undefined);

        fireEvent.focus(hoursSection!);
        fireEvent.keyDown(hoursSection!, { key: 'ArrowUp' });

        expect(hoursSection).toHaveAttribute('aria-valuenow', '15'); // 14 -> 15
      });

      it('should decrement minutes section value on ArrowDown', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const minutesSection = sections.find((s) => s.getAttribute('aria-label') === 'Minutes');
        expect(minutesSection).not.toBe(undefined);

        fireEvent.focus(minutesSection!);
        fireEvent.keyDown(minutesSection!, { key: 'ArrowDown' });

        expect(minutesSection).toHaveAttribute('aria-valuenow', '29'); // 30 -> 29
      });
    });

    describe('Delete key', () => {
      it('should clear the active date section value on Delete', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
        expect(monthSection).not.toBe(undefined);

        fireEvent.focus(monthSection!);
        fireEvent.keyDown(monthSection!, { key: 'Delete' });

        expect(monthSection).not.toHaveAttribute('aria-valuenow');
      });

      it('should clear the active time section value on Delete', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
        expect(hoursSection).not.toBe(undefined);

        fireEvent.focus(hoursSection!);
        fireEvent.keyDown(hoursSection!, { key: 'Delete' });

        expect(hoursSection).not.toHaveAttribute('aria-valuenow');
      });

      it('should not clear when field is readOnly', async () => {
        await render(
          <DateTimeField
            format={dateTimeFormat}
            defaultValue={adapter.date('2024-03-15T14:30', 'default')}
            readOnly
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
        expect(monthSection).not.toBe(undefined);

        fireEvent.focus(monthSection!);
        fireEvent.keyDown(monthSection!, { key: 'Delete' });

        // Value should remain unchanged
        expect(monthSection).toHaveAttribute('aria-valuenow', '3');
      });
    });
  });

  describe('Section display', () => {
    it('should display placeholder text when section is empty', async () => {
      await render(<DateTimeField format={dateTimeFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      // Empty sections should show placeholder, not empty string
      sections.forEach((section) => {
        expect(section.textContent).not.toBe('');
      });
    });

    it('should display value text when section has a value', async () => {
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
      const daySection = sections.find((s) => s.getAttribute('aria-label') === 'Day');
      const yearSection = sections.find((s) => s.getAttribute('aria-label') === 'Year');
      const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
      const minutesSection = sections.find((s) => s.getAttribute('aria-label') === 'Minutes');

      expect(monthSection?.textContent).toBe('03');
      expect(daySection?.textContent).toBe('15');
      expect(yearSection?.textContent).toBe('2024');
      expect(hoursSection?.textContent).toBe('14');
      expect(minutesSection?.textContent).toBe('30');
    });
  });

  describe('Disabled state', () => {
    it('should render sections with aria-disabled when disabled', async () => {
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          disabled
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      sections.forEach((section) => {
        expect(section).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should set tabIndex to -1 on sections when disabled', async () => {
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          disabled
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      sections.forEach((section) => {
        expect(section.tabIndex).toBe(-1);
      });
    });
  });

  describe('Value change callback', () => {
    it('should call onValueChange when date section value changes via ArrowUp', async () => {
      const onValueChangeSpy = vi.fn();
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          onValueChange={onValueChangeSpy}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const monthSection = sections.find((s) => s.getAttribute('aria-label') === 'Month');
      expect(monthSection).not.toBe(undefined);

      fireEvent.focus(monthSection!);
      fireEvent.keyDown(monthSection!, { key: 'ArrowUp' });

      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should call onValueChange when time section value changes via ArrowUp', async () => {
      const onValueChangeSpy = vi.fn();
      await render(
        <DateTimeField
          format={dateTimeFormat}
          defaultValue={adapter.date('2024-03-15T14:30', 'default')}
          onValueChange={onValueChangeSpy}
        />,
      );

      const sections = screen.getAllByRole('spinbutton');
      const hoursSection = sections.find((s) => s.getAttribute('aria-label') === 'Hours');
      expect(hoursSection).not.toBe(undefined);

      fireEvent.focus(hoursSection!);
      fireEvent.keyDown(hoursSection!, { key: 'ArrowUp' });

      expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
