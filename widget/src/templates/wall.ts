import { renderCard } from '../render';
import type { TestimonialPublic, WidgetConfig } from '../types';

/**
 * Wall of Love テンプレート — グリッド表示
 * 要件5 AC-1, 8
 */
export function renderWall(
  testimonials: TestimonialPublic[],
  config: WidgetConfig
): string {
  const cards = testimonials.map((t) => renderCard(t, config)).join('');
  return `<div class="koe-wall">${cards}</div>`;
}
