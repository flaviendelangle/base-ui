import { screen } from '@mui/internal-test-utils';
import { DateField as DateFieldBase } from '@base-ui/react/date-field';
import { TimeField as TimeFieldBase } from '@base-ui/react/time-field';
import { DateTimeField as DateTimeFieldBase } from '@base-ui/react/date-time-field';
import { LocalizationProvider } from '@base-ui/react/localization-provider';
import { frFR } from '@base-ui/react/translations';
import { createRenderer, createTemporalRenderer } from '#test-utils';

describe('Temporal field translations', () => {
  const { render } = createRenderer();
  const { adapter } = createTemporalRenderer();

  const numericDateFormat = `${adapter.formats.monthPadded}/${adapter.formats.dayOfMonthPadded}/${adapter.formats.yearPadded}`;
  const time24Format = `${adapter.formats.hours24hPadded}:${adapter.formats.minutesPadded}`;
  const dateTimeFormat = `${numericDateFormat} ${time24Format}`;

  function DateField(props: DateFieldBase.Root.Props) {
    return (
      <DateFieldBase.Root {...props} data-testid="input">
        {(section) => <DateFieldBase.Section key={section.index} section={section} />}
      </DateFieldBase.Root>
    );
  }

  function TimeField(props: TimeFieldBase.Root.Props) {
    return (
      <TimeFieldBase.Root {...props} data-testid="input">
        {(section) => <TimeFieldBase.Section key={section.index} section={section} />}
      </TimeFieldBase.Root>
    );
  }

  function DateTimeField(props: DateTimeFieldBase.Root.Props) {
    return (
      <DateTimeFieldBase.Root {...props} data-testid="input">
        {(section) => <DateTimeFieldBase.Section key={section.index} section={section} />}
      </DateTimeFieldBase.Root>
    );
  }

  describe('Default English translations', () => {
    it('should render DateField sections with English aria-labels', async () => {
      await render(<DateField format={numericDateFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Month');
      expect(sections[1]).toHaveAttribute('aria-label', 'Day');
      expect(sections[2]).toHaveAttribute('aria-label', 'Year');
    });

    it('should render TimeField sections with English aria-labels', async () => {
      await render(<TimeField format={time24Format} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should render DateTimeField sections with English aria-labels', async () => {
      await render(<DateTimeField format={dateTimeFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Month');
      expect(sections[1]).toHaveAttribute('aria-label', 'Day');
      expect(sections[2]).toHaveAttribute('aria-label', 'Year');
      expect(sections[3]).toHaveAttribute('aria-label', 'Hours');
      expect(sections[4]).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should render empty sections with English aria-valuetext', async () => {
      await render(<DateField format={numericDateFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuetext', 'Empty');
    });

    it('should render Seconds section with English aria-label', async () => {
      const formatWithSeconds = `${time24Format}:${adapter.formats.secondsPadded}`;
      await render(<TimeField format={formatWithSeconds} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[2]).toHaveAttribute('aria-label', 'Seconds');
    });

    it('should render Meridiem section with English aria-label', async () => {
      const ampmFormat = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;
      await render(<TimeField format={ampmFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      const meridiemSection = sections.find((s) => s.getAttribute('aria-label') === 'Meridiem');
      expect(meridiemSection).not.toBe(undefined);
    });

    it('should render placeholder text for empty date sections', async () => {
      await render(<DateField format={numericDateFormat} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0].textContent).toBe('MM'); // month placeholder
      expect(sections[1].textContent).toBe('DD'); // day placeholder
      expect(sections[2].textContent).toBe('YYYY'); // year placeholder
    });

    it('should render placeholder text for empty time sections', async () => {
      await render(<TimeField format={time24Format} />);

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0].textContent).toBe('--'); // hours placeholder
      expect(sections[1].textContent).toBe('--'); // minutes placeholder
    });

    it('should render Clear button with English aria-label', async () => {
      await render(
        <DateFieldBase.Root format={numericDateFormat} defaultValue={adapter.date('2024-03-15', 'default')}>
          <DateFieldBase.SectionList>
            {(section) => <DateFieldBase.Section key={section.index} section={section} />}
          </DateFieldBase.SectionList>
          <DateFieldBase.Clear />
        </DateFieldBase.Root>,
      );

      const clearButton = screen.getByRole('button');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear value');
    });
  });

  describe('French translations', () => {
    it('should render DateField sections with French aria-labels', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <DateField format={numericDateFormat} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Mois');
      expect(sections[1]).toHaveAttribute('aria-label', 'Jour');
      expect(sections[2]).toHaveAttribute('aria-label', 'Année');
    });

    it('should render TimeField sections with French aria-labels', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <TimeField format={time24Format} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Heures');
      expect(sections[1]).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should render DateTimeField sections with French aria-labels', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <DateTimeField format={dateTimeFormat} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-label', 'Mois');
      expect(sections[1]).toHaveAttribute('aria-label', 'Jour');
      expect(sections[2]).toHaveAttribute('aria-label', 'Année');
      expect(sections[3]).toHaveAttribute('aria-label', 'Heures');
      expect(sections[4]).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should render empty sections with French aria-valuetext', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <DateField format={numericDateFormat} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-valuetext', 'Vide');
    });

    it('should render Seconds section with French aria-label', async () => {
      const formatWithSeconds = `${time24Format}:${adapter.formats.secondsPadded}`;
      await render(
        <LocalizationProvider translations={frFR}>
          <TimeField format={formatWithSeconds} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[2]).toHaveAttribute('aria-label', 'Secondes');
    });

    it('should render Meridiem section with French aria-label', async () => {
      const ampmFormat = `${adapter.formats.hours12hPadded}:${adapter.formats.minutesPadded} ${adapter.formats.meridiem}`;
      await render(
        <LocalizationProvider translations={frFR}>
          <TimeField format={ampmFormat} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      const meridiemSection = sections.find((s) => s.getAttribute('aria-label') === 'Méridien');
      expect(meridiemSection).not.toBe(undefined);
    });

    it('should render French placeholder text for empty date sections', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <DateField format={numericDateFormat} />
        </LocalizationProvider>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0].textContent).toBe('MM'); // month placeholder
      expect(sections[1].textContent).toBe('JJ'); // day placeholder (French)
      expect(sections[2].textContent).toBe('AAAA'); // year placeholder (French)
    });

    it('should render Clear button with French aria-label', async () => {
      await render(
        <LocalizationProvider translations={frFR}>
          <DateFieldBase.Root format={numericDateFormat} defaultValue={adapter.date('2024-03-15', 'default')}>
            <DateFieldBase.SectionList>
              {(section) => <DateFieldBase.Section key={section.index} section={section} />}
            </DateFieldBase.SectionList>
            <DateFieldBase.Clear />
          </DateFieldBase.Root>
        </LocalizationProvider>,
      );

      const clearButton = screen.getByRole('button');
      expect(clearButton).toHaveAttribute('aria-label', 'Effacer la valeur');
    });
  });
});
