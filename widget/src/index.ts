/**
 * Koe Widget エントリポイント
 *
 * <script src="https://.../widget.js" data-project="xxx" data-widget="yyy"></script>
 *
 * スクリプトタグの src から API ベース URL を自動検出し、
 * data-widget 属性を持つすべてのスクリプトタグに対してウィジェットをレンダリングする。
 *
 * 要件5 AC-4: Shadow DOM でスタイル分離
 * 要件5 AC-6,7: Powered by Koe バッジ（Free/Pro切替）
 * 要件10 AC-4: Shadow DOM 内にバッジ → CSS 非表示防止
 */

import { fetchWidgetData } from './api';
import { generateStyles } from './styles';
import { renderWall } from './templates/wall';
import { renderCarousel, initCarousel } from './templates/carousel';
import { renderList } from './templates/list';
import { createBadge } from './badge';

(function () {
  // スクリプトの src から API ベース URL を取得する
  // document.currentScript は同期スクリプト実行時のみ有効
  const currentScript =
    (document.currentScript as HTMLScriptElement | null) ||
    ((): HTMLScriptElement | null => {
      const scripts = document.querySelectorAll<HTMLScriptElement>('script[src*="widget.js"]');
      return scripts[scripts.length - 1] ?? null;
    })();

  const apiBase = currentScript
    ? new URL(currentScript.src).origin
    : 'https://koe.example.com';

  // data-widget 属性を持つすべてのスクリプトタグを対象にする
  const scriptTags = document.querySelectorAll<HTMLScriptElement>('script[data-widget]');

  scriptTags.forEach((script) => {
    const widgetId = script.getAttribute('data-widget');
    if (!widgetId) return;

    // 1. コンテナ div をスクリプトタグの直前に挿入
    const container = document.createElement('div');
    container.setAttribute('data-koe', widgetId);
    script.parentNode!.insertBefore(container, script);

    // 2. Shadow DOM を作成（mode: 'open' — SEO インデックス対応）
    const shadow = container.attachShadow({ mode: 'open' });

    // 3. データ取得 → レンダリング
    fetchWidgetData(apiBase, widgetId)
      .then((data) => {
        const { widget, testimonials, plan } = data;
        const config = widget.config;

        // 4. スタイル注入（Shadow DOM 内に閉じる）
        const style = document.createElement('style');
        style.textContent = generateStyles(config);
        shadow.appendChild(style);

        // 5. テンプレートレンダリング
        const wrapper = document.createElement('div');
        wrapper.className = 'koe-widget';

        let html: string;
        if (widget.type === 'carousel') {
          html = renderCarousel(testimonials, config);
        } else if (widget.type === 'list') {
          html = renderList(testimonials, config);
        } else {
          // デフォルト: wall
          html = renderWall(testimonials, config);
        }

        wrapper.innerHTML = html;
        shadow.appendChild(wrapper);

        // カルーセルのインタラクション初期化
        if (widget.type === 'carousel') {
          initCarousel(shadow);
        }

        // 6. Powered by Koe バッジ（Free プラン時のみ表示）
        // Shadow DOM 内に配置するためホストサイト CSS で非表示にできない
        if (plan === 'free') {
          shadow.appendChild(createBadge(apiBase));
        }
      })
      .catch((err: unknown) => {
        // ウィジェット表示失敗はホストサイトの体験を壊さないようにサイレントに扱う
        // eslint-disable-next-line no-console
        console.error('[Koe Widget] Failed to initialize:', err);
      });
  });
})();
