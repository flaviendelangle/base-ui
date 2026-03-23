import type { CollectionItemId } from '@base-ui/react/types';

export interface Permission {
  id: string;
  label: string;
  disabled?: boolean;
  children?: Permission[];
}

export const PERMISSIONS: Permission[] = [
  {
    id: 'user-management',
    label: 'User Management',
    children: [
      { id: 'users.view', label: 'View Users' },
      { id: 'users.create', label: 'Create Users' },
      { id: 'users.edit', label: 'Edit Users' },
      { id: 'users.delete', label: 'Delete Users' },
      { id: 'users.roles', label: 'Manage Roles' },
      { id: 'users.invitations', label: 'Manage Invitations', disabled: true },
    ],
  },
  {
    id: 'content',
    label: 'Content Management',
    children: [
      {
        id: 'content.articles',
        label: 'Articles',
        children: [
          { id: 'content.articles.view', label: 'View Articles' },
          { id: 'content.articles.create', label: 'Create Articles' },
          { id: 'content.articles.edit', label: 'Edit Articles' },
          { id: 'content.articles.delete', label: 'Delete Articles' },
          {
            id: 'content.articles.publish',
            label: 'Publish Articles',
            disabled: true,
          },
        ],
      },
      {
        id: 'content.media',
        label: 'Media',
        children: [
          { id: 'content.media.upload', label: 'Upload Media' },
          { id: 'content.media.delete', label: 'Delete Media' },
          { id: 'content.media.organize', label: 'Organize Media' },
        ],
      },
      {
        id: 'content.comments',
        label: 'Comments',
        children: [
          { id: 'content.comments.view', label: 'View Comments' },
          { id: 'content.comments.moderate', label: 'Moderate Comments' },
          { id: 'content.comments.delete', label: 'Delete Comments' },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    children: [
      { id: 'analytics.dashboards', label: 'View Dashboards' },
      { id: 'analytics.export', label: 'Export Reports' },
      { id: 'analytics.custom', label: 'Create Custom Reports' },
      { id: 'analytics.realtime', label: 'View Real-time Data' },
      {
        id: 'analytics.datasources',
        label: 'Manage Data Sources',
        disabled: true,
      },
    ],
  },
  {
    id: 'system',
    label: 'System Administration',
    children: [
      { id: 'system.server', label: 'Server Settings' },
      {
        id: 'system.security',
        label: 'Security Settings',
        children: [
          { id: 'system.security.2fa', label: 'Two-Factor Authentication' },
          { id: 'system.security.ip', label: 'IP Allowlist' },
          {
            id: 'system.security.sessions',
            label: 'Session Management',
            disabled: true,
          },
        ],
      },
      {
        id: 'system.api-keys',
        label: 'API Keys',
        children: [
          { id: 'system.api-keys.view', label: 'View API Keys' },
          { id: 'system.api-keys.create', label: 'Create API Keys' },
          { id: 'system.api-keys.revoke', label: 'Revoke API Keys' },
        ],
      },
      { id: 'system.audit', label: 'Audit Log' },
      { id: 'system.backup', label: 'Backup & Restore' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Payments',
    children: [
      { id: 'billing.invoices', label: 'View Invoices' },
      { id: 'billing.subscriptions', label: 'Manage Subscriptions' },
      { id: 'billing.payment-methods', label: 'Payment Methods' },
      { id: 'billing.usage', label: 'Usage Reports' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    children: [
      { id: 'integrations.oauth', label: 'OAuth Apps' },
      { id: 'integrations.webhooks', label: 'Webhooks' },
      { id: 'integrations.third-party', label: 'Third-party Services' },
      { id: 'integrations.api', label: 'API Access' },
    ],
  },
];

/**
 * Counts leaf permissions that are not disabled (i.e. selectable).
 */
export function countSelectableLeafPermissions(permissions: readonly Permission[]): number {
  let count = 0;
  for (const permission of permissions) {
    if (permission.children && permission.children.length > 0) {
      count += countSelectableLeafPermissions(permission.children);
    } else if (!permission.disabled) {
      count += 1;
    }
  }
  return count;
}

/**
 * Returns the set of all leaf permission IDs (non-disabled).
 */
export function getSelectableLeafIds(permissions: readonly Permission[]): Set<CollectionItemId> {
  const ids = new Set<CollectionItemId>();
  for (const permission of permissions) {
    if (permission.children && permission.children.length > 0) {
      for (const id of getSelectableLeafIds(permission.children)) {
        ids.add(id);
      }
    } else if (!permission.disabled) {
      ids.add(permission.id);
    }
  }
  return ids;
}
