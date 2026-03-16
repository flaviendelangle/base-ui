'use client';
import * as React from 'react';
import { TemporalValue } from '../../types/temporal';
import { TemporalFieldStore } from '../utils/TemporalFieldStore';

export type DateFieldRootContext = TemporalFieldStore<TemporalValue>;

export const DateFieldRootContext = React.createContext<DateFieldRootContext | undefined>(
  undefined,
);

export function useDateFieldRootContext() {
  const context = React.useContext(DateFieldRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: DateFieldRootContext is missing. DateField, TimeField and DateTimeField parts must be placed within their respective Root component.',
    );
  }
  return context;
}
