/**
 * Share Button Component
 *
 * Provides social media sharing functionality using Web Share API
 * with fallback to copy link.
 *
 * Requirements: Task 18
 */

'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  /** タイトル */
  title: string;
  /** 説明文 */
  text: string;
  /** 共有するURL（省略時は現在のページ） */
  url?: string;
  /** ボタンのスタイル（デフォルト: primary） */
  variant?: 'primary' | 'secondary';
  /** ボタンのサイズ（デフォルト: md） */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Share Button Component
 */
export function ShareButton({
  title,
  text,
  url,
  variant = 'primary',
  size = 'md',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = async () => {
    setError(null);

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to copy
          await copyToClipboard();
        }
      }
    } else {
      // Fallback to copy link
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setError('リンクのコピーに失敗しました');
    }
  };

  const baseClasses =
    'inline-flex items-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSize = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
        aria-label="シェア"
      >
        {copied ? (
          <>
            <Check size={iconSize[size]} />
            <span>コピーしました</span>
          </>
        ) : (
          <>
            <Share2 size={iconSize[size]} />
            <span>シェア</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
