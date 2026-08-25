import React from 'react';

/* ── Simple mock factory ── */

type MockProps = Record<string, unknown> & { children?: React.ReactNode };

/** HeroUI-only props that must never reach the DOM (React warnings). */
const NON_DOM_PROPS = new Set([
  'isIconOnly', 'textValue', 'onAction', 'onSelectionChange', 'selectedKey',
  'isPending', 'variant', 'size', 'isRequired', 'isInvalid', 'isReadOnly',
  'isDismissable', 'placement', 'slot', 'onOpenChange', 'allowsEmptyCollection',
  'defaultFilter', 'isLoading', 'validationBehavior', 'isHeaderSticky',
  'classNames', 'isOpen', 'isDisabled', 'isRowHeader', 'isActive',
  'renderEmptyState',
]);

function stripNonDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!NON_DOM_PROPS.has(key)) out[key] = value;
  }
  return out;
}

function mk(name: string, displayName?: string): React.FC<MockProps> {
  const Cmp: React.FC<MockProps> = ({ children, ...props }) => {
    const { onPress, isDisabled, ...restRaw } = props;
    const rest0 = stripNonDomProps(restRaw);
    const extra: Record<string, unknown> = { ...rest0, 'data-mock': name };
    if (isDisabled !== undefined) extra.disabled = isDisabled;
    if (onPress) extra.onClick = onPress;
    // Buttons must render as <button> for isDisabled/toBeDisabled to work
    if (name === 'Button') {
      return React.createElement('button', extra, children);
    }
    // Inputs/TextAreas must render as real form elements so fireEvent.change works.
    // HeroUI v3 Input/TextArea deliver a DOM EVENT to onChange (TextField
    // normalizes to a value string — see the TextField mock below).
    if (name === 'Input') {
      return React.createElement('input', extra);
    }
    if (name === 'TextArea') {
      return React.createElement('textarea', extra);
    }
    return React.createElement('div', extra, children);
  };
  Cmp.displayName = displayName || name;
  return Cmp;
}

/* ── Individual components ── */

export const Surface = mk('Surface');
export const Spinner = mk('Spinner');
export const Badge = mk('Badge');
export const Button = mk('Button');
export const Label = mk('Label');
export const Input = mk('Input');
export const Separator = mk('Separator');
export const Chip = mk('Chip');

/* ── Tooltip compound ── */

export const Tooltip = Object.assign(mk('Tooltip'), {
  Trigger: mk('Tooltip.Trigger'),
  Content: mk('Tooltip.Content'),
  Arrow: mk('Tooltip.Arrow'),
});

/* ── Pagination compound ── */

export const Pagination = Object.assign(mk('Pagination'), {
  Summary: mk('Pagination.Summary'),
  Content: mk('Pagination.Content'),
  Item: mk('Pagination.Item'),
  Previous: mk('Pagination.Previous'),
  PreviousIcon: mk('Pagination.PreviousIcon'),
  Next: mk('Pagination.Next'),
  NextIcon: mk('Pagination.NextIcon'),
  Link: mk('Pagination.Link'),
});
export const Checkbox = mk('Checkbox');
export const TextArea = mk('TextArea');
export const Breadcrumbs = mk('Breadcrumbs');
export const BreadcrumbsItem = mk('BreadcrumbsItem');
export const ComboBox = Object.assign(mk('ComboBox'), {
  InputGroup: mk('ComboBox.InputGroup'),
  Trigger: mk('ComboBox.Trigger'),
  Value: mk('ComboBox.Value'),
  Popover: mk('ComboBox.Popover'),
});
export const FieldError = mk('FieldError');

/* ── TextField: forwards control props to the inner Input/TextArea and
   normalizes onChange to the VALUE STRING (HeroUI v3 contract). The control
   may be nested inside a layout row (e.g. BuilderControlRow), so the props
   are forwarded to every Input/TextArea descendant, not just direct ones. ── */

export const TextField = (props: MockProps) => {
  const { children, isDisabled, onChange, ...rest0 } = props;
  const rest = stripNonDomProps(rest0);
  if (isDisabled !== undefined) rest.disabled = isDisabled;
  const extra: Record<string, unknown> = { 'data-mock': 'TextField' };
  if (rest0.variant !== undefined) extra['data-variant'] = rest0.variant;
  const forwardedOnChange = onChange
    ? (e: unknown) => {
        if (e && typeof e === 'object' && 'target' in (e as { target?: unknown })) {
          (onChange as (v: string) => void)(((e as { target: { value: string } }).target).value);
        } else {
          (onChange as (v: string) => void)(e as string);
        }
      }
    : undefined;
  const forward = (node: React.ReactNode): React.ReactNode =>
    React.Children.map(node, (child) => {
      if (!React.isValidElement(child)) return child;
      if (child.type === Input || child.type === TextArea) {
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          ...rest,
          onChange: forwardedOnChange,
        });
      }
      const grandChildren = (child.props as { children?: React.ReactNode })?.children;
      if (grandChildren != null) {
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          children: forward(grandChildren),
        });
      }
      return child;
    });
  return React.createElement('div', extra, forward(children));
};

/* ── Form: renders a real <form> so type="submit" buttons submit ── */

export const Form = (props: MockProps) => {
  const { children, ...rest0 } = props;
  const rest = stripNonDomProps(rest0);
  return React.createElement('form', { ...rest, 'data-mock': 'Form' }, children);
};

/* ── Alert compound ── */

export const Alert = Object.assign(mk('Alert'), {
  Indicator: mk('Alert.Indicator'),
  Content: mk('Alert.Content'),
  Title: mk('Alert.Title'),
  Description: mk('Alert.Description'),
});

/* ── Modal compound (gated on isOpen so closed modals render nothing) ── */

export const Modal = (props: MockProps) => {
  const { isOpen, children, ...rest0 } = props;
  if (isOpen === false) return null;
  const rest = stripNonDomProps(rest0);
  return React.createElement('div', { ...rest, 'data-mock': 'Modal' }, children);
};

export const Backdrop = (props: MockProps) => {
  const { isOpen, children, ...rest0 } = props;
  if (isOpen === false) return null;
  const rest = stripNonDomProps(rest0);
  return React.createElement('div', { ...rest, 'data-mock': 'Modal.Backdrop' }, children);
};

Object.assign(Modal, {
  Backdrop,
  Container: mk('Modal.Container'),
  Header: mk('Modal.Header'),
  Body: mk('Modal.Body'),
  Footer: mk('Modal.Footer'),
  Dialog: mk('Modal.Dialog'),
  Heading: mk('Modal.Heading'),
  Icon: mk('Modal.Icon'),
  CloseTrigger: mk('Modal.CloseTrigger'),
});

/* ── Tabs compound (context-driven: clicking a Tab fires onSelectionChange) ── */

const TabsContext = React.createContext<{ onSelectionChange?: (key: React.Key) => void }>({});

export const Tab = (props: MockProps) => {
  const { id, children, ...rest0 } = props;
  const rest = stripNonDomProps(rest0);
  const { onSelectionChange } = React.useContext(TabsContext);
  const handleClick = onSelectionChange ? () => onSelectionChange(String(id)) : undefined;
  return React.createElement(
    'button',
    {
      ...rest,
      'data-mock': 'Tabs.Tab',
      id: String(id),
      type: 'button',
      onClick: handleClick,
    },
    children,
  );
};

export const Tabs = Object.assign(
  (props: MockProps) => {
    const { onSelectionChange, children, ...rest0 } = props;
    const rest = stripNonDomProps(rest0);
    return React.createElement(
      TabsContext.Provider,
      { value: { onSelectionChange: onSelectionChange as ((key: React.Key) => void) | undefined } },
      React.createElement('div', { ...rest, 'data-mock': 'Tabs' }, children),
    );
  },
  {
    ListContainer: mk('Tabs.ListContainer'),
    List: mk('Tabs.List'),
    Tab,
    Indicator: mk('Tabs.Indicator'),
    Panel: mk('Tabs.Panel'),
  },
);

/* ── Table compound ── */

/**
 * Table.Body mirrors the HeroUI v3 contract: when no rows are rendered it
 * invokes the renderEmptyState prop (function), like the real component.
 */
const TableBody: React.FC<MockProps> = ({ children, renderEmptyState, ...rest }) => {
  const isEmpty = React.Children.count(children) === 0;
  const extra: Record<string, unknown> = { ...stripNonDomProps(rest), 'data-mock': 'Table.Body' };
  const content = isEmpty && typeof renderEmptyState === 'function'
    ? renderEmptyState()
    : children;
  return React.createElement('div', extra, content);
};
TableBody.displayName = 'Table.Body';

export const Table = Object.assign(mk('Table'), {
  ScrollContainer: mk('Table.ScrollContainer'),
  Content: mk('Table.Content'),
  Header: mk('Table.Header'),
  Column: mk('Table.Column'),
  Body: TableBody,
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
  ItemIndicator: mk('ListBox.ItemIndicator'),
});

/* ── Dropdown compound ── */

export const Dropdown = Object.assign(mk('Dropdown'), {
  Trigger: mk('Dropdown.Trigger'),
  Popover: mk('Dropdown.Popover'),
  Menu: mk('Dropdown.Menu'),
  Item: mk('Dropdown.Item'),
  ItemIndicator: mk('Dropdown.ItemIndicator'),
  Section: mk('Dropdown.Section'),
});

/* ── Formula builder compounds (inert) ── */

export const Autocomplete = Object.assign(mk('Autocomplete'), {
  Trigger: mk('Autocomplete.Trigger'),
  Value: mk('Autocomplete.Value'),
  ClearButton: mk('Autocomplete.ClearButton'),
  Indicator: mk('Autocomplete.Indicator'),
  Popover: mk('Autocomplete.Popover'),
  Filter: mk('Autocomplete.Filter'),
});

/* ── NumberField: renders a real number input (aria-label/value/onChange
   forwarded) so score/threshold/sample values are queryable and editable. ── */

export const NumberField = (props: MockProps) => {
  const { children, value, onChange, 'aria-label': ariaLabel, ...rest0 } = props as MockProps & {
    value?: number;
    onChange?: (value: unknown) => void;
  };
  const rest = stripNonDomProps(rest0);
  const extra: Record<string, unknown> = { 'data-mock': 'NumberField', ...rest };
  if (rest0.variant !== undefined) extra['data-variant'] = rest0.variant;
  return React.createElement(
    'div',
    extra,
    React.createElement('input', {
      'aria-label': ariaLabel,
      'data-mock': 'NumberField.Input',
      type: 'number',
      value: value != null ? String(value) : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
    }),
    children,
  );
};
NumberField.Group = mk('NumberField.Group');
NumberField.Input = mk('NumberField.Input');
NumberField.IncrementButton = mk('NumberField.IncrementButton');
NumberField.DecrementButton = mk('NumberField.DecrementButton');

export const RadioGroup = mk('RadioGroup');

export const Radio = Object.assign(mk('Radio'), {
  Content: mk('Radio.Content'),
  Control: mk('Radio.Control'),
  Indicator: mk('Radio.Indicator'),
});

export const Toolbar = mk('Toolbar');

export const ButtonGroup = Object.assign(mk('ButtonGroup'), {
  Separator: mk('ButtonGroup.Separator'),
});

export const Disclosure = Object.assign(mk('Disclosure'), {
  Heading: mk('Disclosure.Heading'),
  Trigger: mk('Disclosure.Trigger'),
  Indicator: mk('Disclosure.Indicator'),
  Content: mk('Disclosure.Content'),
  Body: mk('Disclosure.Body'),
});

export const ErrorMessage = mk('ErrorMessage');
export const EmptyState = mk('EmptyState');

export const TagGroup = Object.assign(mk('TagGroup'), {
  List: mk('TagGroup.List'),
});

export const Tag = Object.assign(mk('Tag'), {
  RemoveButton: mk('Tag.RemoveButton'),
});

export const useFilter = () => ({ contains: () => true });

/* ── Toast ── */

export const toast = {
  success: () => {},
  danger: () => {},
  warning: () => {},
  info: () => {},
};
