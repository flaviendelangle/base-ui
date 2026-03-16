import { NOOP } from '../../utils/noop';
import { TemporalAdapter, TemporalValue } from '../../types/temporal';
import { TemporalFieldStoreParameters } from './types';

export function createDefaultStoreParameters(
  adapter: TemporalAdapter,
  format: string,
): TemporalFieldStoreParameters<TemporalValue> {
  return {
    value: undefined,
    defaultValue: undefined,
    onValueChange: undefined,
    referenceDate: undefined,
    format,
    step: 1,
    required: undefined,
    disabled: undefined,
    readOnly: undefined,
    name: undefined,
    id: undefined,
    min: undefined,
    max: undefined,
    timezone: undefined,
    fieldContext: null,
    clearErrors: NOOP,
    adapter,
    direction: 'ltr',
    translations: undefined,
  };
}
