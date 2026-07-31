import * as React from 'react';

export interface SwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Toggle switch with sky track when on. */
export function Switch(props: SwitchProps): JSX.Element;
