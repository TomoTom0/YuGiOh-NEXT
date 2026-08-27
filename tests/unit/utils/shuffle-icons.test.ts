import { describe, it, expect } from 'vitest';
import {
  LOCK_CLOSED_ICON,
  LOCK_OPEN_ICON,
  SHUFFLE_ICON,
  SORT_ICON,
} from '../../../src/utils/shuffle-icons';

describe('shuffle-icons', () => {
  it('SHUFFLE_ICONは実装のSVG shapeを保持する [covers:shuffle_icon.literal_svg_shape]', () => {
    expect(SHUFFLE_ICON).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"');
    expect(SHUFFLE_ICON).toContain('<polyline points="16 3 21 3 21 8"></polyline>');
    expect(SHUFFLE_ICON).toContain('<line x1="4" y1="20" x2="21" y2="3"></line>');
    expect(SHUFFLE_ICON).toContain('<polyline points="21 16 21 21 16 21"></polyline>');
    expect(SHUFFLE_ICON).toContain('<line x1="15" y1="15" x2="21" y2="21"></line>');
    expect(SHUFFLE_ICON).toContain('<line x1="4" y1="4" x2="9" y2="9"></line>');
  });

  it('SORT_ICONは実装のSVG shapeを保持する [covers:sort_icon.literal_svg_shape]', () => {
    expect(SORT_ICON).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"');
    expect(SORT_ICON).toContain('<line x1="4" y1="20" x2="4" y2="14"></line>');
    expect(SORT_ICON).toContain('<line x1="10" y1="20" x2="10" y2="10"></line>');
    expect(SORT_ICON).toContain('<line x1="16" y1="20" x2="16" y2="6"></line>');
    expect(SORT_ICON).toContain('<line x1="22" y1="20" x2="22" y2="2"></line>');
  });

  it('LOCK_CLOSED_ICONは実装のSVG shapeを保持する [covers:lock_closed_icon.literal_svg_shape]', () => {
    expect(LOCK_CLOSED_ICON).toContain('<svg width="12" height="12" viewBox="0 0 24 24"');
    expect(LOCK_CLOSED_ICON).toContain('<rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>');
    expect(LOCK_CLOSED_ICON).toContain('<path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>');
  });

  it('LOCK_OPEN_ICONは実装のSVG shapeを保持する [covers:lock_open_icon.literal_svg_shape]', () => {
    expect(LOCK_OPEN_ICON).toContain('<svg width="12" height="12" viewBox="0 0 24 24"');
    expect(LOCK_OPEN_ICON).toContain('<rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>');
    expect(LOCK_OPEN_ICON).toContain('<path d="M7 11V7a5 5 0 0 1 5-5c1.5 0 2.8 0.6 3.7 1.5M17 11V8" stroke="currentColor" stroke-width="2"/>');
  });
});

