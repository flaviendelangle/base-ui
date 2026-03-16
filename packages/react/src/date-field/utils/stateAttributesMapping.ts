import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import type { DateFieldRootState } from '../root/DateFieldRoot';
import { fieldValidityMapping } from '../../field/utils/constants';

export const stateAttributesMapping: StateAttributesMapping<DateFieldRootState> = {
  ...fieldValidityMapping,
};
