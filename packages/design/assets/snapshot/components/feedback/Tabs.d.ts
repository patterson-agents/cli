import * as React from 'react';

export interface TabsProps {
  /** Strings or {value,label} objects. */
  tabs?: (string | { value: string; label: React.ReactNode })[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Horizontal tab bar with a sky underline indicator on the active tab. */
export function Tabs(props: TabsProps): JSX.Element;
