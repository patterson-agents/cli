import * as React from 'react';

export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Checkbox with sky fill + white check when selected. */
export function Checkbox(props: CheckboxProps): JSX.Element;
