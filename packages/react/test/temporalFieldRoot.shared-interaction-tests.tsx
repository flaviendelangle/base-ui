import { screen, fireEvent } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { TemporalFieldTestDescriptor, adapter } from './temporalField.test-descriptors';

export function describeTemporalFieldInteraction(descriptor: TemporalFieldTestDescriptor) {
  const { name, Field: FieldComponent, defaultFormat, defaultValueISO, expectedSectionLabels } =
    descriptor;

  describe(`<${name} /> - DOM Interactions`, () => {
    const { render } = createRenderer();

    describe('Section display', () => {
      it('should display placeholder text when section is empty', async () => {
        await render(<FieldComponent format={defaultFormat} />);

        const sections = screen.getAllByRole('spinbutton');
        sections.forEach((section) => {
          expect(section.textContent).not.toBe('');
        });
      });

      it('should display value text when section has a value', async () => {
        await render(
          <FieldComponent
            format={defaultFormat}
            defaultValue={adapter.date(defaultValueISO, 'default')}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        sections.forEach((section) => {
          expect(section.textContent).not.toBe('');
          expect(section).toHaveAttribute('aria-valuenow');
        });
      });
    });

    describe('Disabled state', () => {
      it('should render sections with aria-disabled when disabled', async () => {
        await render(
          <FieldComponent
            format={defaultFormat}
            defaultValue={adapter.date(defaultValueISO, 'default')}
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
          <FieldComponent
            format={defaultFormat}
            defaultValue={adapter.date(defaultValueISO, 'default')}
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
      it('should call onValueChange when section value changes via ArrowUp', async () => {
        const onValueChangeSpy = vi.fn();
        await render(
          <FieldComponent
            format={defaultFormat}
            defaultValue={adapter.date(defaultValueISO, 'default')}
            onValueChange={onValueChangeSpy}
          />,
        );

        const sections = screen.getAllByRole('spinbutton');
        const firstSection = sections.find(
          (s) => s.getAttribute('aria-label') === expectedSectionLabels[0],
        )!;
        fireEvent.focus(firstSection);
        fireEvent.keyDown(firstSection, { key: 'ArrowUp' });

        expect(onValueChangeSpy.mock.calls.length).toBeGreaterThan(0);
      });
    });
  });
}
