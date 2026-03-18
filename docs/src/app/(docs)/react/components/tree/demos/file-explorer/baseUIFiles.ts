export interface FileItem {
  id: string;
  label: string;
  fileType:
    | 'folder'
    | 'ts'
    | 'tsx'
    | 'css'
    | 'md'
    | 'json'
    | 'js'
    | 'mjs'
    | 'yaml'
    | 'mts'
    | 'toml'
    | 'other';
  children?: FileItem[];
}

export const BASE_UI_FILES: FileItem[] = [
  {
    id: '.circleci',
    label: '.circleci',
    fileType: 'folder',
    children: [{ id: '.circleci/config.yml', label: 'config.yml', fileType: 'yaml' }],
  },
  {
    id: '.github',
    label: '.github',
    fileType: 'folder',
    children: [
      {
        id: '.github/ISSUE_TEMPLATE',
        label: 'ISSUE_TEMPLATE',
        fileType: 'folder',
        children: [
          { id: '.github/ISSUE_TEMPLATE/bug_report.md', label: 'bug_report.md', fileType: 'md' },
          {
            id: '.github/ISSUE_TEMPLATE/feature_request.md',
            label: 'feature_request.md',
            fileType: 'md',
          },
        ],
      },
      {
        id: '.github/workflows',
        label: 'workflows',
        fileType: 'folder',
        children: [
          { id: '.github/workflows/ci.yml', label: 'ci.yml', fileType: 'yaml' },
          { id: '.github/workflows/release.yml', label: 'release.yml', fileType: 'yaml' },
        ],
      },
      { id: '.github/CODEOWNERS', label: 'CODEOWNERS', fileType: 'other' },
      { id: '.github/dependabot.yml', label: 'dependabot.yml', fileType: 'yaml' },
      { id: '.github/PULL_REQUEST_TEMPLATE.md', label: 'PULL_REQUEST_TEMPLATE.md', fileType: 'md' },
    ],
  },
  {
    id: '.vscode',
    label: '.vscode',
    fileType: 'folder',
    children: [
      { id: '.vscode/extensions.json', label: 'extensions.json', fileType: 'json' },
      { id: '.vscode/settings.json', label: 'settings.json', fileType: 'json' },
    ],
  },
  {
    id: 'docs',
    label: 'docs',
    fileType: 'folder',
    children: [
      {
        id: 'docs/public',
        label: 'public',
        fileType: 'folder',
        children: [{ id: 'docs/public/favicon.ico', label: 'favicon.ico', fileType: 'other' }],
      },
      {
        id: 'docs/src',
        label: 'src',
        fileType: 'folder',
        children: [
          {
            id: 'docs/src/app',
            label: 'app',
            fileType: 'folder',
            children: [
              { id: 'docs/src/app/layout.tsx', label: 'layout.tsx', fileType: 'tsx' },
              { id: 'docs/src/app/page.tsx', label: 'page.tsx', fileType: 'tsx' },
            ],
          },
          {
            id: 'docs/src/components',
            label: 'components',
            fileType: 'folder',
            children: [
              { id: 'docs/src/components/Header.tsx', label: 'Header.tsx', fileType: 'tsx' },
              { id: 'docs/src/components/Sidebar.tsx', label: 'Sidebar.tsx', fileType: 'tsx' },
              { id: 'docs/src/components/CodeBlock.tsx', label: 'CodeBlock.tsx', fileType: 'tsx' },
            ],
          },
          {
            id: 'docs/src/icons',
            label: 'icons',
            fileType: 'folder',
            children: [{ id: 'docs/src/icons/index.ts', label: 'index.ts', fileType: 'ts' }],
          },
          {
            id: 'docs/src/utils',
            label: 'utils',
            fileType: 'folder',
            children: [{ id: 'docs/src/utils/index.ts', label: 'index.ts', fileType: 'ts' }],
          },
          { id: 'docs/src/mdx-components.tsx', label: 'mdx-components.tsx', fileType: 'tsx' },
        ],
      },
      { id: 'docs/next.config.mjs', label: 'next.config.mjs', fileType: 'mjs' },
      { id: 'docs/package.json', label: 'package.json', fileType: 'json' },
      { id: 'docs/postcss.config.js', label: 'postcss.config.js', fileType: 'js' },
      { id: 'docs/tsconfig.json', label: 'tsconfig.json', fileType: 'json' },
    ],
  },
  {
    id: 'packages',
    label: 'packages',
    fileType: 'folder',
    children: [
      {
        id: 'packages/react',
        label: 'react',
        fileType: 'folder',
        children: [
          {
            id: 'packages/react/src',
            label: 'src',
            fileType: 'folder',
            children: [
              {
                id: 'packages/react/src/accordion',
                label: 'accordion',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/accordion/header',
                    label: 'header',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/accordion/header/AccordionHeader.tsx',
                        label: 'AccordionHeader.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/accordion/header/AccordionHeader.test.tsx',
                        label: 'AccordionHeader.test.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/accordion/item',
                    label: 'item',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/accordion/item/AccordionItem.tsx',
                        label: 'AccordionItem.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/accordion/item/AccordionItem.test.tsx',
                        label: 'AccordionItem.test.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/accordion/panel',
                    label: 'panel',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/accordion/panel/AccordionPanel.tsx',
                        label: 'AccordionPanel.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/accordion/root',
                    label: 'root',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/accordion/root/AccordionRoot.tsx',
                        label: 'AccordionRoot.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/accordion/root/AccordionRoot.test.tsx',
                        label: 'AccordionRoot.test.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/accordion/root/AccordionRootContext.ts',
                        label: 'AccordionRootContext.ts',
                        fileType: 'ts',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/accordion/trigger',
                    label: 'trigger',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/accordion/trigger/AccordionTrigger.tsx',
                        label: 'AccordionTrigger.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/accordion/index.ts',
                    label: 'index.ts',
                    fileType: 'ts',
                  },
                  {
                    id: 'packages/react/src/accordion/index.parts.ts',
                    label: 'index.parts.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/alert-dialog',
                label: 'alert-dialog',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/alert-dialog/index.ts',
                    label: 'index.ts',
                    fileType: 'ts',
                  },
                  {
                    id: 'packages/react/src/alert-dialog/index.parts.ts',
                    label: 'index.parts.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/button',
                label: 'button',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/button/Button.tsx',
                    label: 'Button.tsx',
                    fileType: 'tsx',
                  },
                  {
                    id: 'packages/react/src/button/Button.test.tsx',
                    label: 'Button.test.tsx',
                    fileType: 'tsx',
                  },
                  { id: 'packages/react/src/button/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/checkbox',
                label: 'checkbox',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/checkbox/root',
                    label: 'root',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/checkbox/root/CheckboxRoot.tsx',
                        label: 'CheckboxRoot.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/checkbox/root/CheckboxRoot.test.tsx',
                        label: 'CheckboxRoot.test.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/checkbox/indicator',
                    label: 'indicator',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/checkbox/indicator/CheckboxIndicator.tsx',
                        label: 'CheckboxIndicator.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  { id: 'packages/react/src/checkbox/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/collapsible',
                label: 'collapsible',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/collapsible/index.ts',
                    label: 'index.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/combobox',
                label: 'combobox',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/combobox/root',
                    label: 'root',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/combobox/root/ComboboxRoot.tsx',
                        label: 'ComboboxRoot.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/combobox/root/ComboboxRoot.test.tsx',
                        label: 'ComboboxRoot.test.tsx',
                        fileType: 'tsx',
                      },
                      {
                        id: 'packages/react/src/combobox/root/ComboboxRootContext.tsx',
                        label: 'ComboboxRootContext.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/combobox/input',
                    label: 'input',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/combobox/input/ComboboxInput.tsx',
                        label: 'ComboboxInput.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/combobox/item',
                    label: 'item',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/combobox/item/ComboboxItem.tsx',
                        label: 'ComboboxItem.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  {
                    id: 'packages/react/src/combobox/popup',
                    label: 'popup',
                    fileType: 'folder',
                    children: [
                      {
                        id: 'packages/react/src/combobox/popup/ComboboxPopup.tsx',
                        label: 'ComboboxPopup.tsx',
                        fileType: 'tsx',
                      },
                    ],
                  },
                  { id: 'packages/react/src/combobox/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/context-menu',
                label: 'context-menu',
                fileType: 'folder',
                children: [
                  {
                    id: 'packages/react/src/context-menu/index.ts',
                    label: 'index.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/dialog',
                label: 'dialog',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/dialog/index.ts', label: 'index.ts', fileType: 'ts' },
                  {
                    id: 'packages/react/src/dialog/index.parts.ts',
                    label: 'index.parts.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/field',
                label: 'field',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/field/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/form',
                label: 'form',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/form/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/input',
                label: 'input',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/input/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/menu',
                label: 'menu',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/menu/index.ts', label: 'index.ts', fileType: 'ts' },
                  {
                    id: 'packages/react/src/menu/index.parts.ts',
                    label: 'index.parts.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/popover',
                label: 'popover',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/popover/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/progress',
                label: 'progress',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/progress/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/select',
                label: 'select',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/select/index.ts', label: 'index.ts', fileType: 'ts' },
                  {
                    id: 'packages/react/src/select/index.parts.ts',
                    label: 'index.parts.ts',
                    fileType: 'ts',
                  },
                ],
              },
              {
                id: 'packages/react/src/slider',
                label: 'slider',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/slider/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/switch',
                label: 'switch',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/switch/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/tabs',
                label: 'tabs',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/tabs/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/toast',
                label: 'toast',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/toast/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/toggle',
                label: 'toggle',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/toggle/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/tooltip',
                label: 'tooltip',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/tooltip/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/react/src/tree',
                label: 'tree',
                fileType: 'folder',
                children: [
                  { id: 'packages/react/src/tree/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              { id: 'packages/react/src/index.ts', label: 'index.ts', fileType: 'ts' },
            ],
          },
          { id: 'packages/react/package.json', label: 'package.json', fileType: 'json' },
        ],
      },
      {
        id: 'packages/utils',
        label: 'utils',
        fileType: 'folder',
        children: [
          {
            id: 'packages/utils/src',
            label: 'src',
            fileType: 'folder',
            children: [
              {
                id: 'packages/utils/src/store',
                label: 'store',
                fileType: 'folder',
                children: [
                  { id: 'packages/utils/src/store/Store.ts', label: 'Store.ts', fileType: 'ts' },
                  {
                    id: 'packages/utils/src/store/ReactStore.ts',
                    label: 'ReactStore.ts',
                    fileType: 'ts',
                  },
                  {
                    id: 'packages/utils/src/store/ReactStore.test.tsx',
                    label: 'ReactStore.test.tsx',
                    fileType: 'tsx',
                  },
                  {
                    id: 'packages/utils/src/store/useStore.ts',
                    label: 'useStore.ts',
                    fileType: 'ts',
                  },
                  {
                    id: 'packages/utils/src/store/createSelector.ts',
                    label: 'createSelector.ts',
                    fileType: 'ts',
                  },
                  { id: 'packages/utils/src/store/index.ts', label: 'index.ts', fileType: 'ts' },
                ],
              },
              {
                id: 'packages/utils/src/useControlled.ts',
                label: 'useControlled.ts',
                fileType: 'ts',
              },
              {
                id: 'packages/utils/src/useControlled.test.tsx',
                label: 'useControlled.test.tsx',
                fileType: 'tsx',
              },
              {
                id: 'packages/utils/src/useMergedRefs.ts',
                label: 'useMergedRefs.ts',
                fileType: 'ts',
              },
              {
                id: 'packages/utils/src/useMergedRefs.test.tsx',
                label: 'useMergedRefs.test.tsx',
                fileType: 'tsx',
              },
              { id: 'packages/utils/src/useId.ts', label: 'useId.ts', fileType: 'ts' },
              { id: 'packages/utils/src/useId.test.tsx', label: 'useId.test.tsx', fileType: 'tsx' },
              { id: 'packages/utils/src/generateId.ts', label: 'generateId.ts', fileType: 'ts' },
              { id: 'packages/utils/src/owner.ts', label: 'owner.ts', fileType: 'ts' },
              {
                id: 'packages/utils/src/useStableCallback.ts',
                label: 'useStableCallback.ts',
                fileType: 'ts',
              },
              {
                id: 'packages/utils/src/useAnimationFrame.ts',
                label: 'useAnimationFrame.ts',
                fileType: 'ts',
              },
              {
                id: 'packages/utils/src/visuallyHidden.ts',
                label: 'visuallyHidden.ts',
                fileType: 'ts',
              },
              { id: 'packages/utils/src/warn.ts', label: 'warn.ts', fileType: 'ts' },
            ],
          },
          { id: 'packages/utils/package.json', label: 'package.json', fileType: 'json' },
        ],
      },
    ],
  },
  {
    id: 'scripts',
    label: 'scripts',
    fileType: 'folder',
    children: [
      {
        id: 'scripts/api-docs-builder',
        label: 'api-docs-builder',
        fileType: 'folder',
        children: [{ id: 'scripts/api-docs-builder/index.ts', label: 'index.ts', fileType: 'ts' }],
      },
      { id: 'scripts/changelog.config.mjs', label: 'changelog.config.mjs', fileType: 'mjs' },
      { id: 'scripts/tsconfig.json', label: 'tsconfig.json', fileType: 'json' },
    ],
  },
  {
    id: 'test',
    label: 'test',
    fileType: 'folder',
    children: [
      {
        id: 'test/e2e',
        label: 'e2e',
        fileType: 'folder',
        children: [{ id: 'test/e2e/index.test.ts', label: 'index.test.ts', fileType: 'ts' }],
      },
      {
        id: 'test/regressions',
        label: 'regressions',
        fileType: 'folder',
        children: [
          { id: 'test/regressions/index.test.ts', label: 'index.test.ts', fileType: 'ts' },
        ],
      },
      { id: 'test/setupVitest.ts', label: 'setupVitest.ts', fileType: 'ts' },
      { id: 'test/package.json', label: 'package.json', fileType: 'json' },
    ],
  },
  { id: '.editorconfig', label: '.editorconfig', fileType: 'other' },
  { id: '.gitignore', label: '.gitignore', fileType: 'other' },
  { id: 'CHANGELOG.md', label: 'CHANGELOG.md', fileType: 'md' },
  { id: 'CONTRIBUTING.md', label: 'CONTRIBUTING.md', fileType: 'md' },
  { id: 'LICENSE', label: 'LICENSE', fileType: 'other' },
  { id: 'README.md', label: 'README.md', fileType: 'md' },
  { id: 'babel.config.mjs', label: 'babel.config.mjs', fileType: 'mjs' },
  { id: 'eslint.config.mjs', label: 'eslint.config.mjs', fileType: 'mjs' },
  { id: 'lerna.json', label: 'lerna.json', fileType: 'json' },
  { id: 'netlify.toml', label: 'netlify.toml', fileType: 'toml' },
  { id: 'nx.json', label: 'nx.json', fileType: 'json' },
  { id: 'package.json', label: 'package.json', fileType: 'json' },
  { id: 'pnpm-lock.yaml', label: 'pnpm-lock.yaml', fileType: 'yaml' },
  { id: 'pnpm-workspace.yaml', label: 'pnpm-workspace.yaml', fileType: 'yaml' },
  { id: 'prettier.config.mjs', label: 'prettier.config.mjs', fileType: 'mjs' },
  { id: 'tsconfig.json', label: 'tsconfig.json', fileType: 'json' },
  { id: 'vitest.config.mts', label: 'vitest.config.mts', fileType: 'mts' },
  { id: 'vitest.shared.mts', label: 'vitest.shared.mts', fileType: 'mts' },
];
