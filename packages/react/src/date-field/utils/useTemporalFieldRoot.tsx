'use client';
import * as React from 'react';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { useTemporalAdapter } from '../../temporal-adapter-provider/TemporalAdapterContext';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDirection, TextDirection } from '../../direction-provider';
import { useFieldRootContext, FieldRootContext } from '../../field/root/FieldRootContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { useField } from '../../field/useField';
import {
  TemporalAdapter,
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

export interface StoreCreationContext {
  adapter: TemporalAdapter;
  direction: TextDirection;
  fieldContext: FieldRootContext;
  id: string | undefined;
  resolvedFormat: string;
}

interface UseTemporalFieldRootParameters {
  /** The original componentProps, passed through to useRenderElement. */
  componentProps: Record<string, any>;
  /** The forwarded ref from React.forwardRef. */
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  /** Factory to create the store instance. Called once on mount. */
  createStore: (context: StoreCreationContext) => TemporalFieldStore<TemporalValue>;
  /** The static config object from the store class. */
  config: TemporalFieldConfiguration<TemporalValue>;
  /** Resolves the default format when the `format` prop is undefined. */
  getDefaultFormat: (adapter: TemporalAdapter) => string;
  /** The step value for useSyncedValues. DateField passes 1, TimeField/DateTimeField pass `step ?? 1`. */
  step: number;
  // -- Props extracted from componentProps by the Root --
  children?: React.ReactNode | ((section: TemporalFieldSection, index: number) => React.ReactNode);
  required?: boolean | undefined;
  readOnly?: boolean | undefined;
  disabled?: boolean | undefined;
  name?: string | undefined;
  id?: string | undefined;
  inputRef?: React.Ref<HTMLInputElement> | undefined;
  onValueChange?:
    | ((value: TemporalValue, eventDetails: TemporalFieldValueChangeEventDetails) => void)
    | undefined;
  defaultValue?: TemporalValue | undefined;
  value?: TemporalValue | undefined;
  timezone?: TemporalTimezone | undefined;
  referenceDate?: TemporalSupportedObject | undefined;
  format?: string | undefined;
  minDate?: TemporalSupportedObject | undefined;
  maxDate?: TemporalSupportedObject | undefined;
  placeholderGetters?: Partial<TemporalFieldPlaceholderGetters> | undefined;
  actionsRef?: React.RefObject<TemporalFieldRootActions | null> | undefined;
  /** Rest props to forward to the DOM element. */
  elementProps: Record<string, any>;
}

/**
 * Hook managing the root state and rendering of a temporal field component.
 * Returns the full rendered output (context provider + hidden input + element).
 */
export function useTemporalFieldRoot(
  parameters: UseTemporalFieldRootParameters,
): React.JSX.Element {
  const {
    componentProps,
    forwardedRef,
    createStore,
    config,
    getDefaultFormat,
    step,
    children,
    required,
    readOnly,
    disabled,
    name,
    id: idProp,
    inputRef: inputRefProp,
    onValueChange,
    defaultValue,
    value,
    timezone,
    referenceDate,
    format,
    minDate,
    maxDate,
    placeholderGetters,
    actionsRef,
    elementProps,
  } = parameters;

  // 1. Shared hooks
  const fieldContext = useFieldRootContext();
  const adapter = useTemporalAdapter();
  const direction = useDirection();
  const id = useLabelableId({ id: idProp });
  const hiddenInputRef = useMergedRefs(inputRefProp, fieldContext.validation.inputRef);

  // 2. Format resolution
  const resolvedFormat = format ?? getDefaultFormat(adapter);

  // 3. Store creation (factory called once)
  const store = useRefWithInit(() =>
    createStore({ adapter, direction, fieldContext, id, resolvedFormat }),
  ).current;

  // 4. Callbacks (insertion effect — runs before layout effects)
  store.useContextCallback('onValueChange', onValueChange);

  // 5. Derived state (layout effect — compares against old state to detect changes)
  useIsoLayoutEffect(
    () =>
      store.syncDerivedState({
        format: resolvedFormat,
        adapter,
        direction,
        config,
        minDate,
        maxDate,
        placeholderGetters,
        value,
        defaultValue,
        referenceDate,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is static per store class
    [
      store,
      resolvedFormat,
      adapter,
      direction,
      minDate,
      maxDate,
      placeholderGetters,
      value,
      defaultValue,
      referenceDate,
    ],
  );

  // 6. Simple 1:1 state mappings
  store.useSyncedValues({
    required: required ?? false,
    disabledProp: disabled ?? false,
    readOnly: readOnly ?? false,
    nameProp: name,
    id,
    timezoneProp: timezone,
    step,
  });

  // 7. Field context (frequently changing, independent)
  store.useSyncedValue('fieldContext', fieldContext ?? null);

  React.useImperativeHandle(actionsRef, () => store.getActions(), [store]);

  // 8. State selectors, field integration, mount effect, children resolution
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

  // 9. Rendering
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
