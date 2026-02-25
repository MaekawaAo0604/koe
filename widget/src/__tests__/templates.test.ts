import { describe, it, expect } from 'vitest';
import { renderWall } from '../templates/wall';
import { renderList } from '../templates/list';
import { renderCarousel } from '../templates/carousel';
import type { TestimonialPublic, WidgetConfig } from '../types';

const config: WidgetConfig = {
  theme: 'light',
  show_rating: true,
  show_date: false,
  show_avatar: true,
  max_items: 10,
  columns: 3,
  border_radius: 8,
  shadow: false,
  font_family: 'inherit',
};

const testimonials: TestimonialPublic[] = [
  {
    id: '1',
    author_name: 'ユーザー1',
    author_title: null,
    author_company: null,
    author_avatar_url: null,
    rating: 5,
    content: 'テスティモニアル1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    author_name: 'ユーザー2',
    author_title: 'CTO',
    author_company: 'Tech Corp',
    author_avatar_url: 'https://example.com/img.jpg',
    rating: 4,
    content: 'テスティモニアル2',
    created_at: '2024-01-02T00:00:00Z',
  },
];

describe('renderWall', () => {
  it('koe-wall クラスのコンテナを生成する', () => {
    const html = renderWall(testimonials, config);
    expect(html).toContain('koe-wall');
  });

  it('すべてのカードを含む', () => {
    const html = renderWall(testimonials, config);
    expect(html).toContain('ユーザー1');
    expect(html).toContain('ユーザー2');
  });

  it('空のテスティモニアルの場合も koe-wall を生成する', () => {
    const html = renderWall([], config);
    expect(html).toContain('koe-wall');
  });
});

describe('renderList', () => {
  it('koe-list クラスのコンテナを生成する', () => {
    const html = renderList(testimonials, config);
    expect(html).toContain('koe-list');
  });

  it('すべてのカードを含む', () => {
    const html = renderList(testimonials, config);
    expect(html).toContain('ユーザー1');
    expect(html).toContain('ユーザー2');
  });
});

describe('renderCarousel', () => {
  it('koe-carousel クラスのコンテナを生成する', () => {
    const html = renderCarousel(testimonials, config);
    expect(html).toContain('koe-carousel');
    expect(html).toContain('koe-carousel-track');
    expect(html).toContain('koe-carousel-controls');
  });

  it('最初のスライドに active クラスが付く', () => {
    const html = renderCarousel(testimonials, config);
    expect(html).toContain('koe-carousel-slide active');
  });

  it('スライドの数がテスティモニアル件数と一致する', () => {
    const html = renderCarousel(testimonials, config);
    const matches = html.match(/koe-carousel-slide/g) ?? [];
    expect(matches.length).toBe(testimonials.length);
  });

  it('ドットの数がテスティモニアル件数と一致する', () => {
    const html = renderCarousel(testimonials, config);
    const dotMatches = html.match(/koe-dot/g) ?? [];
    expect(dotMatches.length).toBe(testimonials.length);
  });

  it('空のテスティモニアルの場合も安全に処理する', () => {
    const html = renderCarousel([], config);
    expect(html).toContain('koe-carousel');
  });

  it('前へ・次へボタンを含む', () => {
    const html = renderCarousel(testimonials, config);
    expect(html).toContain('koe-prev');
    expect(html).toContain('koe-next');
  });
});
