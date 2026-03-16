import { screen, fireEvent, act } from '@mui/internal-test-utils';
import { DateField as DateFieldBase } from '@base-ui/react/date-field';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { createRenderer, isJSDOM } from '#test-utils';
import {
  describeTemporalFieldRoot,
} from '../utils/temporalFieldRoot.shared-tests';
import {
  dateFieldDescriptor,
  adapter,
} from '../utils/temporalField.test-descriptors';

describeTemporalFieldRoot(dateFieldDescriptor);

describe('<DateField /> - DateField-specific', () => {
  const { render } = createRenderer();
  const numericDateFormat = dateFieldDescriptor.defaultFormat;

  describe('Clear button', () => {
    function DateFieldWithClear(props: DateFieldBase.Root.Props) {
      return (
        <DateFieldBase.Root {...props} data-testid="input">
          <DateFieldBase.SectionList>
            {(section) => <DateFieldBase.Section key={section.index} section={section} />}
          </DateFieldBase.SectionList>
          <DateFieldBase.Clear data-testid="clear" />
        </DateFieldBase.Root>
      );
    }

    it('should have aria-label on clear button', async () => {
      await render(<DateFieldWithClear format={numericDateFormat} />);

      const clearButton = screen.getByTestId('clear');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear value');
    });
  });

  describe('Form', () => {
    it.skipIf(isJSDOM)('clears external errors on change', async () => {
      await render(
        <Form
          errors={{
            date: 'server error',
          }}
        >
          <Field.Root name="date">
            <DateFieldBase.Root
              format={numericDateFormat}
              defaultValue={adapter.date('2024-03-15', 'default')}
              data-testid="input"
            >
              {(section) => <DateFieldBase.Section key={section.index} section={section} />}
            </DateFieldBase.Root>
            <Field.Error data-testid="error" />
          </Field.Root>
        </Form>,
      );

      const sections = screen.getAllByRole('spinbutton');
      expect(sections[0]).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).toHaveTextContent('server error');

      await act(() => sections[0].focus());
      fireEvent.keyDown(sections[0], { key: 'ArrowUp' });

      expect(sections[0]).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByTestId('error')).toBe(null);
    });
  });

  describe('onValueChange event details', () => {
    it.skipIf(isJSDOM)(
      'should provide "keyboard" reason when adjusting value with arrow keys',
      async () => {
        const onValueChange = vi.fn();
        await render(
          <DateFieldBase.Root
            format={numericDateFormat}
            defaultValue={adapter.date('2024-03-15', 'default')}
            onValueChange={onValueChange}
            data-testid="input"
          >
            {(section) => <DateFieldBase.Section key={section.index} section={section} />}
          </DateFieldBase.Root>,
        );

        const sections = screen.getAllByRole('spinbutton');
        await act(() => sections[0].focus());
        fireEvent.keyDown(sections[0], { key: 'ArrowUp' });

        expect(onValueChange.mock.calls.length).toBeGreaterThan(0);
        expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('keyboard');
      },
    );

    it.skipIf(isJSDOM)(
      'should provide "clear-press" reason when clicking clear button',
      async () => {
        const onValueChange = vi.fn();
        await render(
          <DateFieldBase.Root
            format={numericDateFormat}
            defaultValue={adapter.date('2024-03-15', 'default')}
            onValueChange={onValueChange}
            data-testid="input"
          >
            <DateFieldBase.SectionList>
              {(section) => <DateFieldBase.Section key={section.index} section={section} />}
            </DateFieldBase.SectionList>
            <DateFieldBase.Clear data-testid="clear" />
          </DateFieldBase.Root>,
        );

        fireEvent.click(screen.getByTestId('clear'));

        expect(onValueChange.mock.calls.length).toBeGreaterThan(0);
        expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('clear-press');
      },
    );
  });
});
