import { renderCard } from '../render';
import type { TestimonialPublic, WidgetConfig } from '../types';

/**
 * カルーセル テンプレート HTML を生成する
 * 要件5 AC-9 (Pro only)
 */
export function renderCarousel(
  testimonials: TestimonialPublic[],
  config: WidgetConfig
): string {
  if (testimonials.length === 0) {
    return '<div class="koe-carousel"><div class="koe-carousel-track"></div></div>';
  }

  const slides = testimonials
    .map(
      (t, i) =>
        `<div class="koe-carousel-slide${i === 0 ? ' active' : ''}" data-index="${i}">` +
        renderCard(t, config) +
        `</div>`
    )
    .join('');

  const dots = testimonials
    .map(
      (_, i) =>
        `<button class="koe-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="${i + 1}枚目"></button>`
    )
    .join('');

  return (
    `<div class="koe-carousel">` +
    `<div class="koe-carousel-track">${slides}</div>` +
    `<div class="koe-carousel-controls">` +
    `<button class="koe-carousel-btn koe-prev" aria-label="前へ">&#8592;</button>` +
    `<div class="koe-carousel-dots">${dots}</div>` +
    `<button class="koe-carousel-btn koe-next" aria-label="次へ">&#8594;</button>` +
    `</div>` +
    `</div>`
  );
}

/**
 * カルーセルのインタラクション（ボタン + ドット + 自動再生）を初期化する
 * Shadow DOM 内の要素を操作するため shadow root を受け取る
 */
export function initCarousel(shadow: ShadowRoot): void {
  const slides = Array.from(shadow.querySelectorAll<HTMLElement>('.koe-carousel-slide'));
  const dots = Array.from(shadow.querySelectorAll<HTMLElement>('.koe-dot'));
  const prevBtn = shadow.querySelector<HTMLButtonElement>('.koe-prev');
  const nextBtn = shadow.querySelector<HTMLButtonElement>('.koe-next');

  if (slides.length === 0) return;

  let current = 0;

  function goTo(index: number): void {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = ((index % slides.length) + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  // 5 秒ごとに自動再生
  const timer = setInterval(() => goTo(current + 1), 5000);

  // Shadow Root が detach されたら自動再生を止める（SPA 対応）
  const host = shadow.host;
  const observer = new MutationObserver(() => {
    if (!document.contains(host)) {
      clearInterval(timer);
      observer.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
