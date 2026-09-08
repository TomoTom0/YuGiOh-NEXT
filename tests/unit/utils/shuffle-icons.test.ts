import { describe, it, expect } from 'vitest';
import {
  LOCK_CLOSED_ICON,
  LOCK_OPEN_ICON,
  SHUFFLE_ICON,
  SORT_ICON,
} from '../../../src/utils/shuffle-icons';

describe('shuffle-icons', () => {
  it('SHUFFLE_ICONは編集画面と同じmdiShuffleのSVG shapeを保持する [covers:shuffle_icon.literal_svg_shape]', () => {
    expect(SHUFFLE_ICON).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"');
    expect(SHUFFLE_ICON).toContain('<path fill="currentColor" d="M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,7.46L20,9.5V4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z"></path>');
  });

  it('SORT_ICONは編集画面と同じmdiSortのSVG shapeを保持する [covers:sort_icon.literal_svg_shape]', () => {
    expect(SORT_ICON).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"');
    expect(SORT_ICON).toContain('<path fill="currentColor" d="M18 21L14 17H17V7H14L18 3L22 7H19V17H22M2 19V17H12V19M2 13V11H9V13M2 7V5H6V7H2Z"></path>');
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

