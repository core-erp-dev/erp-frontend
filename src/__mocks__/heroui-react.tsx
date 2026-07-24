import React from 'react';

/* ── Simple mock factory ── */

function mk(name: string, displayName?: string): React.FC<Record<string, unknown>> {
  const Cmp: React.FC<Record<string, unknown>> = ({ children, ...props }) =>
    React.createElement('div', { ...props, 'data-mock': name }, children as React.ReactNode[]);
  Cmp.displayName = displayName || name;
  return Cmp;
}

/* ── Individual components ── */

export const Surface = mk('Surface');
export const Spinner = mk('Spinner');
export const Badge = mk('Badge');
export const Button = mk('Button');
export const Alert = mk('Alert');
export const Label = mk('Label');
export const Input = mk('Input');
export const TextField = mk('TextField');

/* ── Modal compound ── */

export const Modal = Object.assign(mk('Modal'), {
  Backdrop: mk('Modal.Backdrop'),
  Container: mk('Modal.Container'),
  Header: mk('Modal.Header'),
  Body: mk('Modal.Body'),
  Footer: mk('Modal.Footer'),
  Dialog: mk('Modal.Dialog'),
  Heading: mk('Modal.Heading'),
  Icon: mk('Modal.Icon'),
  CloseTrigger: mk('Modal.CloseTrigger'),
});

/* ── Table compound ── */

export const Table = Object.assign(mk('Table'), {
  ScrollContainer: mk('Table.ScrollContainer'),
  Content: mk('Table.Content'),
  Header: mk('Table.Header'),
  Column: mk('Table.Column'),
  Body: mk('Table.Body'),
  Row: mk('Table.Row'),
  Cell: mk('Table.Cell'),
  Footer: mk('Table.Footer'),
});

/* ── SearchField compound ── */

export const SearchField = Object.assign(mk('SearchField'), {
  Group: mk('SearchField.Group'),
  SearchIcon: mk('SearchField.SearchIcon'),
  Input: mk('SearchField.Input'),
  ClearButton: mk('SearchField.ClearButton'),
});

/* ── Select compound ── */

export const Select = Object.assign(mk('Select'), {
  Trigger: mk('Select.Trigger'),
  Value: mk('Select.Value'),
  Indicator: mk('Select.Indicator'),
  Popover: mk('Select.Popover'),
});

/* ── ListBox compound ── */

export const ListBox = Object.assign(mk('ListBox'), {
  Item: mk('ListBox.Item'),
});

/* ── Toast ── */

export const toast = {
  success: () => {},
  danger: () => {},
  warning: () => {},
  info: () => {},
};
