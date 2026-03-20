import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

const mockPush = vi.fn();
let currentSearchParams = '';

// useSearchParams が毎回同じインスタンスを返すようにキャッシュ
let cachedParams: URLSearchParams | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => {
    if (!cachedParams) {
      cachedParams = new URLSearchParams(currentSearchParams);
    }
    return cachedParams;
  },
}));

import { useTagUrlSync } from './use-tag-url-sync';

beforeEach(() => {
  currentSearchParams = '';
  cachedParams = null;
  mockPush.mockClear();
  Object.defineProperty(window, 'location', {
    value: { pathname: '/' },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.clearAllMocks();
});

describe('useTagUrlSync', () => {
  it('初回ロード: URLにタグがない場合、onTagsChangeは呼ばれない', () => {
    currentSearchParams = '';
    cachedParams = null;
    const onTagsChange = vi.fn();

    renderHook(() => useTagUrlSync({ selectedTags: [], onTagsChange }));

    expect(onTagsChange).not.toHaveBeenCalled();
  });

  it('初回ロード: URLにタグがある場合、onTagsChangeがパース済みタグで呼ばれる', () => {
    currentSearchParams =
      'tags=' + encodeURIComponent('オセロ') + ',' + encodeURIComponent('初心者向け');
    cachedParams = null;
    const onTagsChange = vi.fn();

    renderHook(() => useTagUrlSync({ selectedTags: [], onTagsChange }));

    expect(onTagsChange).toHaveBeenCalledTimes(1);
    expect(onTagsChange).toHaveBeenCalledWith(['オセロ', '初心者向け']);
  });

  it('タグ変更: selectedTagsが変更されるとrouter.pushでURLが更新される', () => {
    currentSearchParams = '';
    cachedParams = null;
    const onTagsChange = vi.fn();

    const { rerender } = renderHook(
      ({ selectedTags }: { selectedTags: string[] }) =>
        useTagUrlSync({ selectedTags, onTagsChange }),
      { initialProps: { selectedTags: [] as string[] } }
    );

    mockPush.mockClear();
    rerender({ selectedTags: ['test-tag'] });

    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tags=test-tag');
    expect(mockPush.mock.calls[0][1]).toEqual({ scroll: false });
  });

  it('タグクリア: 空配列にするとtagsパラメータがURLから削除される', () => {
    currentSearchParams = '';
    cachedParams = null;
    const onTagsChange = vi.fn();

    const { rerender } = renderHook(
      ({ selectedTags }: { selectedTags: string[] }) =>
        useTagUrlSync({ selectedTags, onTagsChange }),
      { initialProps: { selectedTags: ['test-tag'] as string[] } }
    );

    mockPush.mockClear();
    rerender({ selectedTags: [] });

    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('tags=');
  });

  it('内部更新フラグ: URL復元時にisInternalUpdateがtrueに設定される', () => {
    // URL復元時、isInternalUpdate.current = true が設定され、
    // 直後の syncTagsToUrl 呼び出しで消費されて router.push が抑制される。
    // 初回レンダリングの sync effect で消費されるため、
    // 初回レンダリング時に router.push が呼ばれないことを検証する。
    currentSearchParams = 'tags=' + encodeURIComponent('オセロ');
    cachedParams = null;
    const onTagsChange = vi.fn();

    renderHook(() => useTagUrlSync({ selectedTags: [], onTagsChange }));

    // onTagsChange は URL からタグを復元して呼ばれる
    expect(onTagsChange).toHaveBeenCalledWith(['オセロ']);

    // isInternalUpdate フラグにより、初回の syncTagsToUrl は
    // router.push を呼ばずに早期リターンする
    expect(mockPush).not.toHaveBeenCalled();
  });
});
