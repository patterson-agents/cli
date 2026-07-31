import * as React from 'react';

export interface InputProps {
  label?: React.ReactNode;
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  iconLeft?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Labelled text input with sky focus ring, helper and error states. */
export function Input(props: InputProps): JSX.Element;
