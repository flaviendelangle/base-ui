'use client';
import * as React from 'react';
import { useTemporalAdapter } from '../../temporal-adapter-provider/TemporalAdapterContext';
import { BaseUIComponentProps, MakeOptional } from '../../utils/types';
import {
  AmPmParameters,
  dateTimeFieldConfig,
  getDateTimeFieldDefaultFormat,
} from './dateTimeFieldConfig';
import { FieldRoot } from '../../field';
import { TemporalValue } from '../../types';
import {
  TemporalFieldSection,
  TemporalFieldStoreSharedParameters,
  TemporalFieldRootActions,
} from '../../date-field/utils/types';
import { useTemporalFieldRoot } from '../../date-field/utils/useTemporalFieldRoot';

/**
 * Groups all parts of the date-time field.
 * Renders a `<div>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Date Time Field](https://base-ui.com/react/components/unstable-date-time-field)
 */
export const DateTimeFieldRoot = React.forwardRef(function DateTimeFieldRoot(
  componentProps: DateTimeFieldRoot.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    // Rendering props
    className,
    render,
    children,
    // Form props
    required,
    readOnly,
    disabled,
    name,
    id,
    inputRef,
    // Value props
    onValueChange,
    defaultValue,
    value,
    timezone,
    referenceDate,
    format,
    ampm,
    step,
    // Validation props
    minDate,
    maxDate,
    // Other props
    placeholderGetters,
    actionsRef,
    // Props forwarded to the DOM element
    ...elementProps
  } = componentProps;

  const adapter = useTemporalAdapter();
  const resolvedFormat = format ?? getDateTimeFieldDefaultFormat(adapter, ampm);

  return useTemporalFieldRoot({
    componentProps,
    forwardedRef,
    elementProps,
    config: dateTimeFieldConfig,
    props: {
      children,
      actionsRef,
      inputRef,
      format: resolvedFormat,
      step: step ?? 1,
      required,
      readOnly,
      disabled,
      name,
      id,
      onValueChange,
      defaultValue,
      value,
      timezone,
      referenceDate,
      minDate,
      maxDate,
      placeholderGetters,
    },
  });
});

export interface DateTimeFieldRootState extends FieldRoot.State {
  /**
   * Whether the user must enter a value before submitting a form.
   */
  required: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to change the field value.
   */
  readOnly: boolean;
}

export interface DateTimeFieldRootProps
  extends
    Omit<BaseUIComponentProps<'div', DateTimeFieldRootState>, 'children'>,
    Omit<
      MakeOptional<TemporalFieldStoreSharedParameters<TemporalValue>, 'format'>,
      'fieldContext' | 'adapter' | 'direction'
    >,
    AmPmParameters {
  /**
   * The children of the component.
   * If a function is provided, it will be called with each section as its parameter.
   */
  children?: React.ReactNode | ((section: TemporalFieldSection, index: number) => React.ReactNode);
  /**
   * A ref to imperative actions.
   * - `clear`: Clears the field value.
   */
  actionsRef?: React.RefObject<DateTimeFieldRoot.Actions | null> | undefined;
}

export type DateTimeFieldRootActions = TemporalFieldRootActions;

export namespace DateTimeFieldRoot {
  export type Props = DateTimeFieldRootProps;
  export type State = DateTimeFieldRootState;
  export type Actions = DateTimeFieldRootActions;
}
