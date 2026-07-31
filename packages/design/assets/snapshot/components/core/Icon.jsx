import React from 'react';

/**
 * Patterson icon — renders a glyph from the OFFICIAL Patterson icon font
 * (93 glyphs, extracted from the production storefront pattern library).
 *
 * Because it is a font, the glyph inherits `color` from its context and
 * scales with `size`. There is no stroke to set.
 *
 * <Icon name="cart" />
 * <Icon name="chevron-right" size="sm" color="var(--pat-sky)" />
 */
export const PATTERSON_ICONS = [
  'action-gallery', 'action-lightbox', 'action-play', 'alert', 'arrow-down',
  'arrow-left', 'arrow-right', 'arrow-up', 'cart', 'chat', 'chat_alt', 'check',
  'check_alt', 'chevron-down', 'chevron-down_light', 'chevron-left',
  'chevron-left_light', 'chevron-right', 'chevron-right_light', 'chevron-up',
  'chevron-up_light', 'close', 'close_light', 'close_medium', 'collapse',
  'document', 'down-caret', 'down-right-arrow', 'download', 'email', 'excel',
  'expand', 'external-link', 'facebook', 'facebook_alt', 'facebook_alt_bold',
  'filter', 'formulary-list', 'gear', 'grid', 'hazmat', 'help', 'house', 'info',
  'instagram', 'instagram_alt', 'instagram_outline', 'linkedin', 'linkedin_filled',
  'list', 'list-1', 'locator', 'locked', 'mail', 'map-pin', 'map-pin_alt_outline',
  'menu-dots', 'menu-lines', 'menu-lines_thin', 'pause', 'pdf', 'pedigree', 'phone',
  'pinterest', 'pinterest_alt', 'play', 'plus_circle', 'prescription',
  'previouslypurchased', 'promotion', 'question-mark', 'reddit', 'remove', 'search',
  'search_alt', 'shiponice', 'shipping', 'snapchat', 'speech-bubbles',
  'tag-percentage', 'tag-price', 'toggle-gridview', 'toggle-listview', 'trash',
  'twitter', 'twitter_alt', 'up-caret', 'upload', 'user', 'user_alt', 'user_bold',
  'youtube', 'youtube_alt',
];

const SIZES = { sm: 'var(--icon-size-sm)', md: 'var(--icon-size-md)', lg: 'var(--icon-size-lg)' };

export function Icon({ name, size = 'md', color, label, style, ...rest }) {
  const resolved = SIZES[size] || size;
  return (
    <i
      className={`pat-i pat-i-${name}`}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ fontSize: resolved, color: color || 'inherit', ...style }}
      {...rest}
    />
  );
}
