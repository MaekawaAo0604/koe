import { describe, it, expect } from 'vitest';
import { escapeHtml, renderCard } from '../render';
import type { TestimonialPublic, WidgetConfig } from '../types';

const baseConfig: WidgetConfig = {
  theme: 'light',
  show_rating: true,
  show_date: true,
  show_avatar: true,
  max_items: 10,
  columns: 3,
  border_radius: 8,
  shadow: true,
  font_family: 'inherit',
};

const baseTestimonial: TestimonialPublic = {
  id: 'test-1',
  author_name: '田中 太郎',
  author_title: 'CEO',
  author_company: 'テスト株式会社',
  author_avatar_url: null,
  rating: 5,
  content: 'このサービスは素晴らしいです！',
  created_at: '2024-01-01T00:00:00Z',
};

describe('escapeHtml', () => {
  it('HTML特殊文字をエスケープする', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('アンパサンドをエスケープする', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('シングルクォートをエスケープする', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('エスケープ不要な文字はそのまま返す', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('renderCard', () => {
  it('カードの基本構造を生成する', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('koe-card');
    expect(html).toContain('koe-content');
    expect(html).toContain('koe-author');
  });

  it('著者名を正しく表示する', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('田中 太郎');
  });

  it('コンテンツをエスケープして表示する', () => {
    const t = { ...baseTestimonial, content: '<b>テスト</b>' };
    const html = renderCard(t, baseConfig);
    expect(html).toContain('&lt;b&gt;テスト&lt;/b&gt;');
    expect(html).not.toContain('<b>テスト</b>');
  });

  it('★評価を表示する（show_rating=true）', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('koe-stars');
    expect(html).toContain('koe-star on');
  });

  it('★評価を非表示にする（show_rating=false）', () => {
    const html = renderCard(baseTestimonial, { ...baseConfig, show_rating: false });
    expect(html).not.toContain('koe-stars');
  });

  it('日付を表示する（show_date=true）', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('koe-date');
  });

  it('日付を非表示にする（show_date=false）', () => {
    const html = renderCard(baseTestimonial, { ...baseConfig, show_date: false });
    expect(html).not.toContain('koe-date');
  });

  it('アバターURL なしの場合はイニシャルを表示する', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('koe-avatar');
    // 「田」の1文字目が表示される
    expect(html).toContain('田');
  });

  it('アバターURL ありの場合は img タグを表示する', () => {
    const t = { ...baseTestimonial, author_avatar_url: 'https://example.com/avatar.jpg' };
    const html = renderCard(t, baseConfig);
    expect(html).toContain('<img');
    expect(html).toContain('https://example.com/avatar.jpg');
  });

  it('アバターを非表示にする（show_avatar=false）', () => {
    const html = renderCard(baseTestimonial, { ...baseConfig, show_avatar: false });
    expect(html).not.toContain('koe-avatar');
  });

  it('役職と会社名を表示する', () => {
    const html = renderCard(baseTestimonial, baseConfig);
    expect(html).toContain('CEO');
    expect(html).toContain('テスト株式会社');
    expect(html).toContain(' / ');
  });

  it('役職と会社名が null の場合はメタを表示しない', () => {
    const t = { ...baseTestimonial, author_title: null, author_company: null };
    const html = renderCard(t, baseConfig);
    expect(html).not.toContain('koe-author-meta');
  });

  it('5つの星のうち rating 分だけ on クラスが付く', () => {
    const t = { ...baseTestimonial, rating: 3 };
    const html = renderCard(t, baseConfig);
    const onCount = (html.match(/koe-star on/g) ?? []).length;
    expect(onCount).toBe(3);
    // span タグが 5 つある（`<span class="koe-star` で数える）
    const allStarSpans = (html.match(/<span class="koe-star/g) ?? []).length;
    expect(allStarSpans).toBe(5);
  });
});
