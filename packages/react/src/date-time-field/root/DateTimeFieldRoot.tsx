'use client';
import * as React from 'react';
import { BaseUIComponentProps, MakeOptional } from '../../utils/types';
import { AmPmParameters, DateTimeFieldStore } from './DateTimeFieldStore';
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

  return useTemporalFieldRoot({
    componentProps,
    forwardedRef,
    elementProps,
    createStore: (ctx) =>
      new DateTimeFieldStore({
        readOnly,
        disabled,
        required,
        onValueChange,
        defaultValue,
        value,
        timezone,
        referenceDate,
        format: ctx.resolvedFormat,
        ampm,
        step,
        name,
        id: ctx.id,
        fieldContext: ctx.fieldContext,
        adapter: ctx.adapter,
        direction: ctx.direction,
        minDate,
        maxDate,
        placeholderGetters,
      }),
    config: DateTimeFieldStore.config,
    getDefaultFormat: (adapter) => DateTimeFieldStore.getDefaultFormat(adapter, ampm),
    step: step ?? 1,
    children,
    required,
    readOnly,
    disabled,
    name,
    id,
    inputRef,
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
    Omit<MakeOptional<TemporalFieldStoreSharedParameters<TemporalValue>, 'format'>, 'fieldContext'>,
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
