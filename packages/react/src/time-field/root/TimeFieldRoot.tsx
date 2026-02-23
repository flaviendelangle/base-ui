'use client';
import * as React from 'react';
import { BaseUIComponentProps, MakeOptional } from '../../utils/types';
import { AmPmParameters, TimeFieldStore } from './TimeFieldStore';
import { FieldRoot } from '../../field';
import { TemporalValue } from '../../types';
import {
  TemporalFieldSection,
  TemporalFieldStoreSharedParameters,
  TemporalFieldRootActions,
} from '../../date-field/utils/types';
import { useTemporalFieldRoot } from '../../date-field/utils/useTemporalFieldRoot';

/**
 * Groups all parts of the time field.
 * Renders a `<div>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Time Field](https://base-ui.com/react/components/unstable-time-field)
 */
export const TimeFieldRoot = React.forwardRef(function TimeFieldRoot(
  componentProps: TimeFieldRoot.Props,
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
      new TimeFieldStore({
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
    config: TimeFieldStore.config,
    getDefaultFormat: (adapter) => TimeFieldStore.getDefaultFormat(adapter, ampm),
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

export interface TimeFieldRootState extends FieldRoot.State {
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

export interface TimeFieldRootProps
  extends
    Omit<BaseUIComponentProps<'div', TimeFieldRootState>, 'children'>,
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
  actionsRef?: React.RefObject<TimeFieldRoot.Actions | null> | undefined;
}

export type TimeFieldRootActions = TemporalFieldRootActions;

export namespace TimeFieldRoot {
  export type Props = TimeFieldRootProps;
  export type State = TimeFieldRootState;
  export type Actions = TimeFieldRootActions;
}
