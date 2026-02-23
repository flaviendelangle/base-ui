'use client';
import * as React from 'react';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { useTemporalAdapter } from '../../temporal-adapter-provider/TemporalAdapterContext';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDirection } from '../../direction-provider';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { useField } from '../../field/useField';
import {
  TemporalSupportedObject,
  TemporalTimezone,
  TemporalValue,
  TemporalFieldPlaceholderGetters,
} from '../../types';
import { TemporalFieldStore } from './TemporalFieldStore';
import { DateFieldRootContext } from '../root/DateFieldRootContext';
import { DateFieldSectionList } from '../section-list/DateFieldSectionList';
import {
  TemporalFieldSection,
  TemporalFieldConfiguration,
  TemporalFieldRootActions,
  TemporalFieldValueChangeEventDetails,
} from './types';

export interface TemporalFieldRootResolvedProps {
  children?: React.ReactNode | ((section: TemporalFieldSection, index: number) => React.ReactNode);
  actionsRef?: React.RefObject<TemporalFieldRootActions | null> | undefined;
  inputRef?: React.Ref<HTMLInputElement> | undefined;
  /**
   * The resolved format string (default already applied by the Root component).
   */
  format: string;
  step: number;
  required: boolean | undefined;
  readOnly: boolean | undefined;
  disabled: boolean | undefined;
  name: string | undefined;
  id: string | undefined;
  onValueChange:
    | ((value: TemporalValue, eventDetails: TemporalFieldValueChangeEventDetails) => void)
    | undefined;
  defaultValue: TemporalValue | undefined;
  value: TemporalValue | undefined;
  timezone: TemporalTimezone | undefined;
  referenceDate: TemporalSupportedObject | undefined;
  minDate: TemporalSupportedObject | undefined;
  maxDate: TemporalSupportedObject | undefined;
  placeholderGetters: Partial<TemporalFieldPlaceholderGetters> | undefined;
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
  props: TemporalFieldRootResolvedProps;
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
    minDate,
    maxDate,
    placeholderGetters,
  } = props;

  const fieldContext = useFieldRootContext();
  const adapter = useTemporalAdapter();
  const direction = useDirection();
  const id = useLabelableId({ id: idProp });
  const hiddenInputRef = useMergedRefs(inputRefProp, fieldContext.validation.inputRef);

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
          adapter,
          direction,
          minDate,
          maxDate,
          placeholderGetters,
        },
        config,
      ),
  ).current;

  store.useContextCallback('onValueChange', onValueChange);

  store.useSyncedValues({
    rawFormat: format,
    adapter,
    direction,
    config,
    minDate,
    maxDate,
    placeholderGetters,
    referenceDateProp: referenceDate ?? null,
    required: required ?? false,
    disabledProp: disabled ?? false,
    readOnly: readOnly ?? false,
    nameProp: name,
    id,
    timezoneProp: timezone,
    step,
    fieldContext: fieldContext ?? null,
  });

  store.useControlledProp('valueProp', value);

  React.useImperativeHandle(actionsRef, () => store.getActions(), [store]);

  const hiddenInputProps = store.useState('hiddenInputProps');
  const state = store.useState('rootState');
  const useFieldParams = store.useState('useFieldParams');

  useField(useFieldParams);
  useOnMount(store.mountEffect);

  const resolvedChildren =
    typeof children === 'function' ? (
      <DateFieldSectionList>{children}</DateFieldSectionList>
    ) : (
      children
    );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, useFieldParams.controlRef],
    props: [store.rootEventHandlers, { children: resolvedChildren }, elementProps],
  });

  return (
    <DateFieldRootContext.Provider value={store}>
      <input {...hiddenInputProps} {...store.hiddenInputEventHandlers} ref={hiddenInputRef} />
      {element}
    </DateFieldRootContext.Provider>
  );
}
