/**
 * Powered by Koe バッジを生成する
 *
 * Shadow DOM 内に配置するため DOM Element を返す。
 * Shadow DOM 内に閉じているため、ホストサイトの CSS で非表示にできない。
 * 要件10 AC-1,2,4 / 要件5 AC-6
 */
export function createBadge(apiBase: string): HTMLElement {
  const utm = 'utm_source=widget&utm_medium=badge&utm_campaign=plg';
  const href = `${apiBase}/?${utm}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'koe-badge';

  // rel="noopener noreferrer" で安全にホスティングサイトから遷移
  wrapper.innerHTML =
    `<a href="${href}" class="koe-badge-link" target="_blank" rel="noopener noreferrer">` +
    // シンプルな "K" ロゴ (SVG)
    `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">` +
    `<text x="1" y="10" font-size="10" font-family="sans-serif" font-weight="bold">K</text>` +
    `</svg>` +
    `Powered by Koe` +
    `</a>`;

  return wrapper;
}
