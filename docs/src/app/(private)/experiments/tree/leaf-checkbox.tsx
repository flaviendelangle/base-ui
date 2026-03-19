'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './tree.module.css';

const items: Tree.DefaultItemModel[] = [
  {
    id: 'user-management',
    label: 'User Management',
    children: [
      {
        id: 'user-accounts',
        label: 'Accounts',
        children: [
          { id: 'create-user', label: 'Create users' },
          { id: 'delete-user', label: 'Delete users' },
          { id: 'suspend-user', label: 'Suspend users' },
          { id: 'reset-password', label: 'Reset passwords' },
        ],
      },
      {
        id: 'user-roles',
        label: 'Roles',
        children: [
          { id: 'assign-role', label: 'Assign roles' },
          { id: 'create-role', label: 'Create roles' },
          { id: 'delete-role', label: 'Delete roles' },
        ],
      },
      {
        id: 'user-groups',
        label: 'Groups',
        children: [
          { id: 'create-group', label: 'Create groups' },
          { id: 'manage-members', label: 'Manage members' },
        ],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    children: [
      {
        id: 'articles',
        label: 'Articles',
        children: [
          { id: 'create-article', label: 'Create articles' },
          { id: 'edit-article', label: 'Edit articles' },
          { id: 'publish-article', label: 'Publish articles' },
          { id: 'archive-article', label: 'Archive articles' },
        ],
      },
      {
        id: 'media',
        label: 'Media',
        children: [
          { id: 'upload-media', label: 'Upload files' },
          { id: 'delete-media', label: 'Delete files' },
          { id: 'organize-media', label: 'Organize folders' },
        ],
      },
      {
        id: 'comments',
        label: 'Comments',
        children: [
          { id: 'moderate-comments', label: 'Moderate comments' },
          { id: 'delete-comments', label: 'Delete comments' },
          { id: 'pin-comments', label: 'Pin comments' },
        ],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    children: [
      {
        id: 'settings',
        label: 'Settings',
        children: [
          { id: 'general-settings', label: 'General settings' },
          { id: 'security-settings', label: 'Security settings' },
          { id: 'email-settings', label: 'Email settings' },
        ],
      },
      {
        id: 'integrations',
        label: 'Integrations',
        children: [
          { id: 'manage-api-keys', label: 'Manage API keys' },
          { id: 'configure-webhooks', label: 'Configure webhooks' },
          { id: 'oauth-apps', label: 'OAuth applications' },
        ],
      },
      {
        id: 'logs',
        label: 'Logs',
        children: [
          { id: 'view-audit-log', label: 'View audit log' },
          { id: 'export-logs', label: 'Export logs' },
        ],
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    children: [
      { id: 'view-invoices', label: 'View invoices' },
      { id: 'manage-subscriptions', label: 'Manage subscriptions' },
      { id: 'update-payment', label: 'Update payment method' },
      { id: 'download-receipts', label: 'Download receipts' },
    ],
  },
];

function isLeaf(item: Tree.DefaultItemModel): boolean {
  return !item.children || item.children.length === 0;
}

export default function LeafCheckboxTree() {
  return (
    <div className={styles.wrapper}>
      <div>
        <h3 className={styles.heading}>Leaf checkbox selection</h3>
        <p className={styles.description}>
          Only leaf items have checkboxes. Parent items are used for grouping only.
        </p>
      </div>
      <Tree.Root
        items={items}
        defaultExpandedItems={['user-management', 'user-accounts', 'content', 'billing']}
        selectionMode="multiple"
        isItemSelectionDisabled={(item) => !isLeaf(item)}
        checkboxSelectionPropagation={{ parents: false, descendants: false }}
        className={styles.tree}
      >
        {(item) =>
          isLeaf(item) ? (
            <Tree.CheckboxItem itemId={item.id} className={styles.item}>
              <Tree.CheckboxItemIndicator className={styles.checkboxIndicator} keepMounted>
                <CheckIcon />
              </Tree.CheckboxItemIndicator>
              <Tree.ItemLabel className={styles.label} />
            </Tree.CheckboxItem>
          ) : (
            <Tree.Item itemId={item.id} className={styles.item}>
              <Tree.ItemExpansionTrigger className={styles.expansionTrigger}>
                <ChevronIcon />
              </Tree.ItemExpansionTrigger>
              <Tree.ItemLabel className={styles.label} />
            </Tree.Item>
          )
        }
      </Tree.Root>
    </div>
  );
}

function ChevronIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path
        d="M4.5 2L8.5 6L4.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M9.854 3.146a.5.5 0 010 .708l-4.5 4.5a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L5 7.293l4.146-4.147a.5.5 0 01.708 0z" />
    </svg>
  );
}
