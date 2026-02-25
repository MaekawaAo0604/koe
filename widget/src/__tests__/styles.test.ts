import { describe, it, expect } from 'vitest';
import { generateStyles } from '../styles';
import type { WidgetConfig } from '../types';

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

describe('generateStyles', () => {
  it('ライトテーマのとき白背景カードカラーを含む', () => {
    const css = generateStyles(baseConfig);
    expect(css).toContain('#ffffff'); // cardBg light
  });

  it('ダークテーマのとき暗いカードカラーを含む', () => {
    const css = generateStyles({ ...baseConfig, theme: 'dark' });
    expect(css).toContain('#1f2937'); // cardBg dark
  });

  it('border_radius が CSS に反映される', () => {
    const css = generateStyles({ ...baseConfig, border_radius: 16 });
    expect(css).toContain('border-radius:16px');
  });

  it('shadow=true のとき box-shadow を含む', () => {
    const css = generateStyles({ ...baseConfig, shadow: true });
    expect(css).toContain('box-shadow');
  });

  it('shadow=false のとき box-shadow を含まない', () => {
    const css = generateStyles({ ...baseConfig, shadow: false });
    expect(css).not.toContain('box-shadow');
  });

  it('columns 設定がグリッドに反映される', () => {
    const css = generateStyles({ ...baseConfig, columns: 4 });
    expect(css).toContain('repeat(4,minmax(0,1fr))');
  });

  it('カスタムフォントが CSS に含まれる', () => {
    const css = generateStyles({ ...baseConfig, font_family: 'Georgia, serif' });
    expect(css).toContain('Georgia, serif');
  });

  it('inherit フォントのときシステムフォントスタックを使用する', () => {
    const css = generateStyles({ ...baseConfig, font_family: 'inherit' });
    expect(css).toContain('-apple-system');
  });

  it('koe-badge スタイルを含む（Free バッジ用）', () => {
    const css = generateStyles(baseConfig);
    expect(css).toContain('.koe-badge');
    expect(css).toContain('.koe-badge-link');
  });

  it('カルーセル用スタイルを含む', () => {
    const css = generateStyles(baseConfig);
    expect(css).toContain('.koe-carousel');
    expect(css).toContain('.koe-carousel-slide.active');
  });
});
