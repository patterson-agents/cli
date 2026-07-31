import * as React from 'react';

/** Every glyph in the official Patterson icon font. */
export declare const PATTERSON_ICONS: string[];

export interface IconProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  /** Glyph name from the official Patterson icon font, e.g. "cart", "chevron-right". */
  name: string;
  /** Preset ramp (sm 14px / md 20px / lg 24px) or any CSS length. */
  size?: 'sm' | 'md' | 'lg' | string;
  /** Any CSS color; defaults to inherited `currentColor`. */
  color?: string;
  /** Accessible name. Omit for purely decorative glyphs (renders aria-hidden). */
  label?: string;
}

/**
 * Renders a glyph from the official Patterson icon font. Inherits color and
 * scales with font-size — there is no stroke to set.
 */
export declare function Icon(props: IconProps): React.JSX.Element;
