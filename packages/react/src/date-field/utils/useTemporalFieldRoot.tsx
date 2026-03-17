'use client';
import * as React from 'react';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { visuallyHiddenInput } from '@base-ui/utils/visuallyHidden';
import { useTemporalAdapter } from '../../temporal-adapter-provider/TemporalAdapterContext';
import { useTranslations } from '../../localization-provider/LocalizationContext';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDirection } from '../../direction-provider';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useFormContext } from '../../form/FormContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../labelable-provider/useAriaLabelledBy';
import { useField } from '../../field/useField';
import { stateAttributesMapping } from './stateAttributesMapping';
import { TemporalValue } from '../../types/temporal';
import { TemporalFieldStore } from './TemporalFieldStore';
import { DateFieldRootContext } from '../root/DateFieldRootContext';
import { DateFieldSectionList } from '../section-list/DateFieldSectionList';
import {
  TemporalFieldStoreParameters,
  TemporalFieldSection,
  TemporalFieldConfiguration,
  TemporalFieldRootActions,
} from './types';
import { isDatePart } from './utils';
import { temporalFieldSectionLabelKey } from '../../translations/types';

export interface UseTemporalFieldRootProps extends Omit<
  TemporalFieldStoreParameters<TemporalValue>,
  'adapter' | 'direction' | 'translations' | 'fieldContext' | 'clearErrors'
> {
  /**
   * The children of the component.
   * If a function is provided, it will be called with each section as its parameter.
   */
  children?: React.ReactNode | ((section: TemporalFieldSection, index: number) => React.ReactNode);
  /**
   * A ref to imperative actions.
   * - `clear`: Clears the field value.
   */
  actionsRef?: React.RefObject<TemporalFieldRootActions | null> | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: React.Ref<HTMLInputElement> | undefined;
}

interface UseTemporalFieldRootParameters {
  // Rendering infrastructure
  /** The original componentProps, passed through to useRenderElement. */
  componentProps: Record<string, any>;
  /** The forwarded ref from React.forwardRef. */
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  /** Rest props to forward to the DOM element. */
  elementProps: Record<string, any>;

  // Field type configuration
  /** The static config object for this field type. */
  config: TemporalFieldConfiguration<TemporalValue>;

  // Component props (from the Root's componentProps, with defaults applied)
  props: UseTemporalFieldRootProps;
}

/**
 * Hook managing the root state and rendering of a temporal field component.
 * Returns the full rendered output (context provider + hidden input + element).
 */
export function useTemporalFieldRoot(
  parameters: UseTemporalFieldRootParameters,
): React.JSX.Element {
  const { componentProps, forwardedRef, elementProps, config, props } = parameters;
  const {
    children,
    actionsRef,
    inputRef: inputRefProp,
    format,
    step,
    required,
    readOnly,
    disabled,
    name,
    id: idProp,
    onValueChange,
    defaultValue,
    value,
    timezone,
    referenceDate,
    min,
    max,
  } = props;

  const fieldContext = useFieldRootContext();
  const { clearErrors } = useFormContext();
  const adapter = useTemporalAdapter();
  const translations = useTranslations();
  const direction = useDirection();
  const id = useLabelableId({ id: idProp });
  const { getDescriptionProps, labelId } = useLabelableContext();
  const ariaLabelledBy = useAriaLabelledBy(undefined, labelId, fieldContext.validation.inputRef);
  const { 'aria-describedby': ariaDescribedBy } = getDescriptionProps({});

  const store = useRefWithInit(
    () =>
      new TemporalFieldStore(
        {
          readOnly,
          disabled,
          required,
          onValueChange,
          defaultValue,
          value,
          timezone,
          referenceDate,
          format,
          step,
          name,
          id,
          fieldContext,
          clearErrors,
          adapter,
          translations,
          direction,
          min,
          max,
        },
        config,
      ),
  ).current;

  store.useContextCallback('onValueChange', onValueChange);

  store.useSyncedValues({
    rawFormat: format,
    adapter,
    translations,
    direction,
    min,
    max,
    referenceDateProp: referenceDate ?? null,
    required: required ?? false,
    disabledProp: disabled ?? false,
    readOnly: readOnly ?? false,
    nameProp: name,
    id,
    timezoneProp: timezone,
    step,
    fieldContext,
    clearErrors,
    ariaLabelledBy,
    ariaDescribedBy,
  });

  store.useControlledProp('valueProp', value);

  React.useImperativeHandle(actionsRef, () => store.getActions(), [store]);

  const hiddenInputProps = store.useState('hiddenInputProps');
  const state = store.useState('rootState');
  const useFieldParams = store.useState('useFieldParams');
  const sections = store.useState('sections');
  const hiddenInputRef = useMergedRefs(
    inputRefProp,
    fieldContext.validation.inputRef,
    useFieldParams.controlRef,
  );

  useField(useFieldParams);
  useOnMount(store.mountEffect);

  React.useLayoutEffect(() => {
    store.syncSelectionToDOM();
  }, [sections, store]);

  const resolvedChildren =
    typeof children === 'function' ? (
      <DateFieldSectionList>{children}</DateFieldSectionList>
    ) : (
      children
    );

  // Render visually-hidden label spans for each date-part section so that
  // spinbutton elements can reference both the field label and the part name
  // via aria-labelledby (e.g. "Birthday Month, spinbutton").
  // They are aria-hidden to prevent them appearing in reading-mode navigation,
  // which is allowed — aria-labelledby resolution traverses aria-hidden elements.
  const hiddenSectionLabels =
    ariaLabelledBy && id
      ? sections.filter(isDatePart).map((section) => (
          <span
            key={section.token.config.part}
            id={`${id}-${section.token.config.part}-label`}
            style={visuallyHiddenInput}
            aria-hidden="true"
          >
            {translations[temporalFieldSectionLabelKey[section.token.config.part]]}
          </span>
        ))
      : null;

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, store.rootRef],
    props: [
      store.rootEventHandlers,
      {
        role: 'group',
        'aria-labelledby': ariaLabelledBy,
        children: (
          <React.Fragment>
            {hiddenSectionLabels}
            {resolvedChildren}
          </React.Fragment>
        ),
      },
      getDescriptionProps,
      elementProps,
    ],
    stateAttributesMapping,
  });

  return (
    <DateFieldRootContext.Provider value={store}>
      {element}
      <input {...hiddenInputProps} {...store.hiddenInputEventHandlers} ref={hiddenInputRef} />
    </DateFieldRootContext.Provider>
  );
}
