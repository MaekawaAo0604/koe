import { describe, it, expect } from 'vitest';
import { createBadge } from '../badge';

describe('createBadge', () => {
  it('koe-badge クラスの div を返す', () => {
    const badge = createBadge('https://koe.example.com');
    expect(badge.tagName.toLowerCase()).toBe('div');
    expect(badge.className).toBe('koe-badge');
  });

  it('アンカーリンクを含む', () => {
    const badge = createBadge('https://koe.example.com');
    const link = badge.querySelector('a');
    expect(link).not.toBeNull();
  });

  it('href に UTM パラメータが含まれる', () => {
    const badge = createBadge('https://koe.example.com');
    const link = badge.querySelector('a')!;
    expect(link.getAttribute('href')).toContain('utm_source=widget');
    expect(link.getAttribute('href')).toContain('utm_medium=badge');
    expect(link.getAttribute('href')).toContain('utm_campaign=plg');
  });

  it('href が apiBase を使って生成される', () => {
    const badge = createBadge('https://custom.example.com');
    const link = badge.querySelector('a')!;
    expect(link.getAttribute('href')).toContain('https://custom.example.com');
  });

  it('target="_blank" が設定されている', () => {
    const badge = createBadge('https://koe.example.com');
    const link = badge.querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('rel="noopener noreferrer" が設定されている（セキュリティ）', () => {
    const badge = createBadge('https://koe.example.com');
    const link = badge.querySelector('a')!;
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('"Powered by Koe" テキストを含む', () => {
    const badge = createBadge('https://koe.example.com');
    expect(badge.textContent).toContain('Powered by Koe');
  });
});
