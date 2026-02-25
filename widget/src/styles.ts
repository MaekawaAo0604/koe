import type { WidgetConfig } from './types';

/**
 * ウィジェット設定に基づいて Shadow DOM 内の CSS を生成する
 * 要件5 AC-4: Shadow DOM でスタイル分離
 */
export function generateStyles(config: WidgetConfig): string {
  const dark = config.theme === 'dark';
  const bg = dark ? '#111827' : '#f9fafb';
  const cardBg = dark ? '#1f2937' : '#ffffff';
  const cardBorder = dark ? '#374151' : '#e5e7eb';
  const textPrimary = dark ? '#f9fafb' : '#111827';
  const textSecondary = dark ? '#9ca3af' : '#6b7280';
  const starColor = '#f59e0b';
  const starEmpty = dark ? '#4b5563' : '#d1d5db';
  const avatarBg = dark ? '#374151' : '#e5e7eb';
  const avatarText = dark ? '#d1d5db' : '#374151';
  const btnBorder = dark ? '#4b5563' : '#d1d5db';
  const r = `${config.border_radius}px`;
  const cols = config.columns > 0 ? config.columns : 3;
  const font =
    config.font_family && config.font_family !== 'inherit'
      ? config.font_family
      : '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

  return (
    `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}` +
    `:host{display:block;font-family:${font};-webkit-font-smoothing:antialiased;color-scheme:${config.theme}}` +
    `.koe-widget{background:${bg};padding:16px}` +
    `.koe-card{background:${cardBg};border:1px solid ${cardBorder};border-radius:${r};padding:16px;` +
    (config.shadow ? 'box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.07)' : '') +
    `}` +
    `.koe-stars{display:flex;gap:2px;margin-bottom:8px;line-height:1}` +
    `.koe-star{font-size:13px;color:${starEmpty}}` +
    `.koe-star.on{color:${starColor}}` +
    `.koe-content{color:${textPrimary};font-size:14px;line-height:1.65;margin-bottom:12px}` +
    `.koe-author{display:flex;align-items:center;gap:8px}` +
    `.koe-avatar{width:32px;height:32px;border-radius:50%;background:${avatarBg};color:${avatarText};` +
    `display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;overflow:hidden}` +
    `.koe-avatar img{width:100%;height:100%;object-fit:cover}` +
    `.koe-author-info{min-width:0}` +
    `.koe-author-name{color:${textPrimary};font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` +
    `.koe-author-meta{color:${textSecondary};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}` +
    `.koe-date{color:${textSecondary};font-size:11px;margin-top:8px}` +
    // Wall テンプレート
    `.koe-wall{display:grid;gap:16px;grid-template-columns:repeat(${cols},minmax(0,1fr))}` +
    `@media(max-width:768px){.koe-wall{grid-template-columns:repeat(${Math.min(cols, 2)},minmax(0,1fr))}}` +
    `@media(max-width:480px){.koe-wall{grid-template-columns:1fr}}` +
    // List テンプレート
    `.koe-list{display:flex;flex-direction:column;gap:16px}` +
    // Carousel テンプレート
    `.koe-carousel{position:relative}` +
    `.koe-carousel-track{overflow:hidden}` +
    `.koe-carousel-slide{display:none}` +
    `.koe-carousel-slide.active{display:block}` +
    `.koe-carousel-controls{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px}` +
    `.koe-carousel-btn{background:none;border:1px solid ${btnBorder};border-radius:50%;` +
    `width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;` +
    `color:${textPrimary};font-size:14px;line-height:1;transition:background .15s;padding:0}` +
    `.koe-carousel-btn:hover{background:${cardBorder}}` +
    `.koe-carousel-dots{display:flex;gap:6px;align-items:center}` +
    `.koe-dot{width:6px;height:6px;border-radius:50%;background:${btnBorder};cursor:pointer;border:none;padding:0;transition:background .15s}` +
    `.koe-dot.active{background:${textSecondary}}` +
    // Powered by Koe バッジ (要件10 AC-4)
    `.koe-badge{display:flex;align-items:center;justify-content:center;padding:8px 0 4px}` +
    `.koe-badge-link{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${textSecondary};` +
    `text-decoration:none;opacity:.65;transition:opacity .2s}` +
    `.koe-badge-link:hover{opacity:1}`
  );
}
