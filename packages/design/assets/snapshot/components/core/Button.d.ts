import * as React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /**
   * Visual intent. `primary` and `secondary` are the two production-verified
   * Patterson buttons; the rest are system additions.
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'sky' | 'outline' | 'ghost' | 'onDark';
  /** @default "md" (production geometry: 15px/30px padding) */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Opt into this design system's fully-rounded convention. Production
   * Patterson buttons are 5px, so leave this off to match the live sites.
   * @default false
   */
  pill?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Patterson action button, matching the live theme: 5px radius, 15px/30px
 * padding, 15px/600 label. `primary` is solid navy #003767 hovering to a
 * lighter navy #315D83 — it does NOT turn sky. `secondary` is a filled light
 * blue #6DCFF6 with a navy label. Use `outline` / `ghost` for tertiary actions
 * and `onDark` over navy surfaces.
 *
 * @startingPoint section="Core" subtitle="Navy button — 5px radius, navy→#315D83 hover" viewport="700x220"
 */
export function Button(props: ButtonProps): JSX.Element;
