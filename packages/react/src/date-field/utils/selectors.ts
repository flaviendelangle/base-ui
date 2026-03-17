import { createSelector, createSelectorMemoized } from '@base-ui/utils/store';
import { visuallyHiddenInput } from '@base-ui/utils/visuallyHidden';
import { NOOP } from '@base-ui/utils/empty';
import { TemporalAdapter } from '../../types/temporal';
import { TemporalFieldState as State, TemporalFieldDatePart, TemporalFieldSection } from './types';
import type { FieldRootContext } from '../../field/root/FieldRootContext';
import { DEFAULT_FIELD_ROOT_STATE } from '../../field/utils/constants';
import { getTimezoneToRender, isDatePart, removeLocalizedDigits } from './utils';
import {
  getAriaValueText,
  getLocalizedDigits,
  getMeridiemsStr,
  getMonthsStr,
  getWeekDaysStr,
} from './adapter-cache';
import { temporalFieldSectionLabelKey } from '../../translations/types';

const SEPARATOR_STYLE: React.CSSProperties = { whiteSpace: 'pre' };

const adapterSelector = createSelector((state: State) => state.adapter);
const timezoneToRenderSelector = createSelectorMemoized(
  adapterSelector,
  (state: State) => state.manager,
  (state: State) => state.value,
  (state: State) => state.referenceDateProp,
  (state: State) => state.timezoneProp,
  getTimezoneToRender,
);
const requiredSelector = createSelector((state: State) => state.required);
const disabledSelector = createSelector(
  (state: State) => state.fieldContext?.state.disabled || state.disabledProp,
);
const readOnlySelector = createSelector((state: State) => state.readOnly);
const editableSelector = createSelector(
  (state: State) => !(state.fieldContext?.state.disabled || state.disabledProp) && !state.readOnly,
);
const invalidSelector = createSelector((state: State) => state.fieldContext?.state.valid === false);
const nameSelector = createSelector((state: State) => state.fieldContext?.name ?? state.nameProp);
const idSelector = createSelector((state: State) => state.id);
const managerSelector = createSelector((state: State) => state.manager);
const configSelector = createSelector((state: State) => state.config);
const validationPropsSelector = createSelectorMemoized(
  (state: State) => state.min,
  (state: State) => state.max,
  (min, max) => ({ min, max }),
);
const fieldContextSelector = createSelector((state: State) => state.fieldContext);
const stepSelector = createSelector((state: State) => state.step);
const hiddenInputRefSelector = createSelector((state: State) => state.hiddenInputRef);
const ariaLabelledBySelector = createSelector((state: State) => state.ariaLabelledBy);
const ariaDescribedBySelector = createSelector((state: State) => state.ariaDescribedBy);
const focusedSectionIndexSelector = createSelector((state: State) => state.focusedSectionIndex);
const valueSelector = createSelector((state: State) => state.value);
const lastValidValueSelector = createSelector((state: State) => state.lastValidValue);
const sectionsSelector = createSelector((state: State) => state.sections);
const areAllSectionsEmptySelector = createSelectorMemoized(
  (state: State) => state.sections,
  (sections) => sections.every((section) => !isDatePart(section) || section.value === ''),
);
const referenceValueSelector = createSelectorMemoized(
  (state: State) => state.lastValidValue,
  (state: State) => state.referenceDateProp,
  timezoneToRenderSelector,
  validationPropsSelector,
  (state: State) => state.format.granularity,
  (state: State) => state.manager,
  adapterSelector,
  configSelector,
  (
    lastValidValue,
    referenceDate,
    timezone,
    validationProps,
    granularity,
    manager,
    adapter,
    config,
  ) =>
    config.getReferenceValue({
      lastValidValue,
      externalReferenceDate: referenceDate ?? undefined,
      adapter,
      validationProps,
      granularity,
      dateType: manager.dateType,
      timezone,
    }),
);

const formatSelector = createSelector((state: State) => state.format);
const translationsSelector = createSelector((state: State) => state.translations);

export const selectors = {
  // Base
  timezoneToRender: timezoneToRenderSelector,
  required: requiredSelector,
  disabled: disabledSelector,
  readOnly: readOnlySelector,
  editable: editableSelector,
  invalid: invalidSelector,
  name: nameSelector,
  id: idSelector,
  adapter: adapterSelector,
  manager: managerSelector,
  config: configSelector,
  validationProps: validationPropsSelector,
  fieldContext: fieldContextSelector,
  step: stepSelector,

  // CharacterEditing
  characterQuery: createSelector((state: State) => state.characterQuery),

  // Value
  value: valueSelector,
  lastValidValue: lastValidValueSelector,
  referenceValue: referenceValueSelector,

  // Section
  sections: sectionsSelector,
  selectedSection: createSelector((state: State) => state.selectedSection),
  areAllSectionsEmpty: areAllSectionsEmptySelector,
  datePart: createSelectorMemoized(
    (state: State) => state.sections,
    (sectionsList, sectionIndex: number) => {
      const section = sectionsList[sectionIndex];
      if (!isDatePart(section)) {
        return null;
      }

      return section;
    },
  ),
  activeDatePart: createSelectorMemoized(
    (state: State) => state.sections,
    (state: State) => state.selectedSection,
    (sectionsList, activeSectionIndex): TemporalFieldDatePart | null => {
      if (activeSectionIndex == null) {
        return null;
      }

      const activeSection = sectionsList[activeSectionIndex];
      if (!isDatePart(activeSection)) {
        return null;
      }

      return activeSection;
    },
  ),

  // Format
  format: formatSelector,

  // ElementsProps
  rootState: createSelectorMemoized(
    requiredSelector,
    readOnlySelector,
    disabledSelector,
    invalidSelector,
    fieldContextSelector,
    (required, readOnly, disabled, invalid, fieldContext: FieldRootContext | null) => ({
      ...(fieldContext?.state ?? DEFAULT_FIELD_ROOT_STATE),
      required,
      readOnly,
      disabled,
      invalid,
    }),
  ),
  hiddenInputProps: createSelectorMemoized(
    valueSelector,
    formatSelector,
    adapterSelector,
    configSelector,
    requiredSelector,
    disabledSelector,
    readOnlySelector,
    nameSelector,
    idSelector,
    validationPropsSelector,
    stepSelector,
    areAllSectionsEmptySelector,
    (
      value,
      format,
      adapter,
      config,
      required,
      disabled,
      readOnly,
      name,
      id,
      validationProps,
      step,
      areAllSectionsEmpty,
    ) => {
      const formattedValue = config.stringifyValueForHiddenInput(
        adapter,
        value,
        format.granularity,
      );
      // Return '' for empty, 'invalid' for partial fill (triggers badInput constraint), or the formatted value.
      let hiddenValue: string;
      if (formattedValue !== '') {
        hiddenValue = formattedValue;
      } else {
        hiddenValue = areAllSectionsEmpty ? '' : 'invalid';
      }
      return {
        ...config.stringifyValidationPropsForHiddenInput(adapter, validationProps, format, step),
        type: config.hiddenInputType,
        value: hiddenValue,
        name,
        id,
        disabled,
        readOnly,
        required,
        'aria-hidden': true,
        tabIndex: -1,
        style: visuallyHiddenInput,
      };
    },
  ),
  /**
   * Returns the params to pass to `useField` hook for form integration.
   */
  useFieldParams: createSelectorMemoized(
    idSelector,
    nameSelector,
    adapterSelector,
    configSelector,
    fieldContextSelector,
    hiddenInputRefSelector,
    valueSelector,
    formatSelector,
    (id, name, adapter, config, fieldContext, hiddenInputRef, value, format) => {
      const formValue = config.stringifyValueForHiddenInput(adapter, value, format.granularity);
      const commit = fieldContext != null ? fieldContext.validation.commit : NOOP;

      return {
        id,
        name,
        value: formValue,
        getValue: () => formValue,
        commit,
        controlRef: hiddenInputRef,
      };
    },
  ),
  sectionProps: createSelectorMemoized(
    adapterSelector,
    editableSelector,
    disabledSelector,
    readOnlySelector,
    invalidSelector,
    requiredSelector,
    timezoneToRenderSelector,
    translationsSelector,
    idSelector,
    ariaLabelledBySelector,
    ariaDescribedBySelector,
    focusedSectionIndexSelector,
    (
      adapter,
      editable,
      disabled,
      readOnly,
      invalid,
      required,
      timezone,
      translations,
      id,
      ariaLabelledBy,
      ariaDescribedBy,
      focusedSectionIndex,
      section: TemporalFieldSection,
    ): React.HTMLAttributes<HTMLDivElement> => {
      // Date part
      if (isDatePart(section)) {
        const part = section.token.config.part;
        // Only enable contentEditable when this specific section is DOM-focused.
        // Webkit browsers have a bug where clicking on non-interactive elements near an
        // inline-block contenteditable will route focus to it. Keeping contentEditable
        // disabled until the section is focused prevents this spurious focus.
        const isContentEditable = editable && focusedSectionIndex === section.index;
        return {
          // Aria attributes
          'aria-readonly': readOnly,
          'aria-invalid': invalid || undefined,
          'aria-required': required || undefined,
          'aria-valuenow': getAriaValueNow(adapter, section),
          'aria-valuemin': section.token.boundaries.characterEditing.minimum,
          'aria-valuemax': section.token.boundaries.characterEditing.maximum,
          'aria-valuetext': section.value
            ? getAriaValueText(adapter, section, timezone)
            : translations.temporalFieldEmptySectionText,
          // When a field label exists, reference both the field label and the
          // per-section hidden label span so screen readers announce e.g. "Birthday Month".
          // Fall back to aria-label when no field label is available.
          ...(ariaLabelledBy && id
            ? { 'aria-labelledby': `${ariaLabelledBy} ${id}-${part}-label` }
            : { 'aria-label': translations[temporalFieldSectionLabelKey[part]] }),
          'aria-describedby': ariaDescribedBy || undefined,
          'aria-disabled': disabled,

          // Other
          children: section.value || section.token.placeholder,
          tabIndex: editable ? 0 : -1,
          contentEditable: isContentEditable,
          suppressContentEditableWarning: true,
          role: 'spinbutton',
          spellCheck: isContentEditable ? false : undefined,
          // Firefox hydrates this as `'none`' instead of `'off'`. No problems in chromium with both values.
          // For reference https://github.com/mui/mui-x/issues/19012
          autoCapitalize: isContentEditable ? 'none' : undefined,
          autoCorrect: isContentEditable ? 'off' : undefined,
          inputMode: section.token.config.contentType === 'letter' ? 'text' : 'numeric',
        };
      }

      // Separator
      return {
        // Aria attributes
        'aria-hidden': true,

        // Other
        children: section.value,
        style: SEPARATOR_STYLE,
      };
    },
  ),
  clearPropsAndState: createSelectorMemoized(
    disabledSelector,
    readOnlySelector,
    areAllSectionsEmptySelector,
    translationsSelector,
    (disabledFromState, readOnly, areAllSectionsEmpty, translations, disabledProp: boolean) => {
      const disabled = disabledFromState || disabledProp;
      return {
        props: {
          tabIndex: -1,
          children: 'x',
          'aria-label': translations.temporalFieldClearLabel,
          'aria-disabled': disabled || readOnly || undefined,
        },
        state: {
          disabled,
          empty: areAllSectionsEmpty,
          readOnly,
        },
      };
    },
  ),
};

function getAriaValueNow(
  adapter: TemporalAdapter,
  section: TemporalFieldDatePart,
): number | undefined {
  if (section.value === '') {
    return undefined;
  }

  const localizedDigits = getLocalizedDigits(adapter);

  switch (section.token.config.part) {
    case 'month': {
      if (section.token.config.contentType === 'letter') {
        const index = getMonthsStr(adapter, section.token.value).indexOf(section.value);
        return index >= 0 ? index + 1 : undefined;
      }
      return Number(removeLocalizedDigits(section.value, localizedDigits));
    }
    case 'weekDay': {
      if (section.token.config.contentType === 'letter') {
        const index = getWeekDaysStr(adapter, section.token.value).indexOf(section.value);
        return index >= 0 ? index + 1 : undefined;
      }
      return Number(removeLocalizedDigits(section.value, localizedDigits));
    }
    case 'day':
      return parseInt(removeLocalizedDigits(section.value, localizedDigits), 10);
    case 'meridiem': {
      const index = getMeridiemsStr(adapter, section.token.value).indexOf(section.value);
      return index >= 0 ? index : undefined;
    }
    default:
      return section.token.config.contentType !== 'letter'
        ? Number(removeLocalizedDigits(section.value, localizedDigits))
        : undefined;
  }
}
