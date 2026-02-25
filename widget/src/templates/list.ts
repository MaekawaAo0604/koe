import { renderCard } from '../render';
import type { TestimonialPublic, WidgetConfig } from '../types';

/**
 * リスト テンプレート — 縦並び表示
 * 要件5 AC-9 (Pro only)
 */
export function renderList(
  testimonials: TestimonialPublic[],
  config: WidgetConfig
): string {
  const cards = testimonials.map((t) => renderCard(t, config)).join('');
  return `<div class="koe-list">${cards}</div>`;
}
