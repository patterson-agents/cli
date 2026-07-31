import * as React from 'react';

export interface RadioProps {
  label?: React.ReactNode;
  value?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: (string | { value: string; label: React.ReactNode })[];
  direction?: 'row' | 'column';
  gap?: string;
  style?: React.CSSProperties;
}

/** Radio control with sky dot. `Radio.Group` manages a set + selection. */
export function Radio(props: RadioProps): JSX.Element;
