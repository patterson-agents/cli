import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps {
  label?: React.ReactNode;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Strings or {value,label} objects. */
  options?: (string | SelectOption)[];
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** Native select restyled with the brand chevron and sky focus ring. */
export function Select(props: SelectProps): JSX.Element;
