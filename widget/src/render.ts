import type { TestimonialPublic, WidgetConfig } from './types';

/** HTML エスケープ（XSS 防止） */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** ★評価 HTML */
function renderStars(rating: number, show: boolean): string {
  if (!show) return '';
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="koe-star${i < rating ? ' on' : ''}">&#9733;</span>`
  ).join('');
  return `<div class="koe-stars" aria-label="${rating}点中5点">${stars}</div>`;
}

/** アバター HTML */
function renderAvatar(t: TestimonialPublic, show: boolean): string {
  if (!show) return '';
  if (t.author_avatar_url) {
    return (
      `<div class="koe-avatar">` +
      `<img src="${escapeHtml(t.author_avatar_url)}" alt="${escapeHtml(t.author_name)}" loading="lazy">` +
      `</div>`
    );
  }
  return `<div class="koe-avatar" aria-hidden="true">${escapeHtml(t.author_name.charAt(0).toUpperCase())}</div>`;
}

/** 著者メタ（役職 / 会社名） HTML */
function renderAuthorMeta(t: TestimonialPublic): string {
  const parts = [t.author_title, t.author_company].filter(Boolean) as string[];
  if (!parts.length) return '';
  return `<div class="koe-author-meta">${escapeHtml(parts.join(' / '))}</div>`;
}

/** テスティモニアル カード HTML を生成する */
export function renderCard(t: TestimonialPublic, config: WidgetConfig): string {
  const date = config.show_date
    ? `<div class="koe-date">${escapeHtml(
        new Date(t.created_at).toLocaleDateString('ja-JP')
      )}</div>`
    : '';

  return (
    `<div class="koe-card">` +
    renderStars(t.rating, config.show_rating) +
    `<div class="koe-content">\u201c${escapeHtml(t.content)}\u201d</div>` +
    `<div class="koe-author">` +
    renderAvatar(t, config.show_avatar) +
    `<div class="koe-author-info">` +
    `<div class="koe-author-name">${escapeHtml(t.author_name)}</div>` +
    renderAuthorMeta(t) +
    `</div></div>` +
    date +
    `</div>`
  );
}
