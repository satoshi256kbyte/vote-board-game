/**
 * Share Button Component
 *
 * Provides SNS-specific sharing buttons (X/Twitter, LINE, link copy).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Twitter, MessageCircle, Link } from 'lucide-react';
import { buildShareUrlForX, buildShareUrlForLine } from '@/lib/ogp/ogp-utils';

interface ShareButtonProps {
  /** タイトル */
  title: string;
  /** 説明文 */
  text: string;
  /** 共有するURL（省略時は現在のページ） */
  url?: string;
}

/**
 * Share Button Component
 *
 * Displays 3 individual buttons: X (Twitter), LINE, and link copy.
 */
export function ShareButton({ title, text: _text, url }: ShareButtonProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleShareX = useCallback(() => {
    const xUrl = buildShareUrlForX(title, shareUrl);
    window.open(xUrl, '_blank', 'noopener,noreferrer');
  }, [title, shareUrl]);

  const handleShareLine = useCallback(() => {
    const lineUrl = buildShareUrlForLine(shareUrl);
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  }, [shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        setCopyStatus('リンクのコピーに失敗しました');
        setTimeout(() => setCopyStatus(null), 2000);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('コピーしました');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('リンクのコピーに失敗しました');
      setTimeout(() => setCopyStatus(null), 2000);
    }
  }, [shareUrl]);

  const buttonBase =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  return (
    <div className="flex items-center gap-2" data-testid="share-buttons">
      <button
        onClick={handleShareX}
        className={`${buttonBase} bg-black text-white hover:bg-gray-800 focus:ring-gray-500`}
        aria-label="Xでシェア"
        data-testid="share-button-x"
      >
        <Twitter size={16} />
        <span>X</span>
      </button>

      <button
        onClick={handleShareLine}
        className={`${buttonBase} bg-[#06C755] text-white hover:bg-[#05b34c] focus:ring-green-500`}
        aria-label="LINEでシェア"
        data-testid="share-button-line"
      >
        <MessageCircle size={16} />
        <span>LINE</span>
      </button>

      <button
        onClick={handleCopyLink}
        className={`${buttonBase} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500`}
        aria-label="リンクをコピー"
        data-testid="share-button-copy"
      >
        <Link size={16} />
        <span>{copyStatus || 'リンクコピー'}</span>
      </button>
    </div>
  );
}
