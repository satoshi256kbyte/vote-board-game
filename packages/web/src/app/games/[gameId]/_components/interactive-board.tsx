'use client';

import { useMemo, useCallback, useState, memo, useEffect, useRef } from 'react';
import { BoardCell } from './board-cell';
import { calculateLegalMoves } from '@/lib/utils/legal-moves';

interface Position {
  row: number;
  col: number;
}

interface InteractiveBoardProps {
  boardState: string[][]; // 8x8の盤面状態
  currentPlayer: 'black' | 'white'; // 現在のプレイヤー
  selectedPosition: { row: number; col: number } | null; // 選択された位置
  onCellClick: (row: number, col: number) => void; // セルクリックハンドラー
  cellSize?: number; // セルサイズ（デフォルト: 40px desktop, 30px mobile）
  disabled?: boolean; // 無効化フラグ
}

/**
 * インタラクティブなオセロ盤面コンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでメモ化し、propsが変更されない限り再レンダリングを防止
 * - useMemoで合法手の計算結果をキャッシュ
 * - useCallbackでイベントハンドラーを安定化
 */
export const InteractiveBoard = memo(function InteractiveBoard({
  boardState,
  currentPlayer,
  selectedPosition,
  onCellClick,
  cellSize,
  disabled = false,
}: InteractiveBoardProps) {
  // ホバーされたセルの状態
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  // エラーメッセージの状態
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // キーボードフォーカスされたセルの状態
  const [focusedCell, setFocusedCell] = useState<Position | null>(null);
  // タイマーIDの参照
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 盤面コンテナの参照
  const boardRef = useRef<HTMLDivElement | null>(null);

  // エラータイムアウトのクリーンアップ
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // レスポンシブなセルサイズの決定
  // デスクトップ: 40px、モバイル: 30px
  const responsiveCellSize =
    cellSize ?? (typeof window !== 'undefined' && window.innerWidth >= 768 ? 40 : 30);

  // 合法手の計算（メモ化）
  const legalMoves = useMemo(() => {
    return calculateLegalMoves(boardState as ('empty' | 'black' | 'white')[][], currentPlayer);
  }, [boardState, currentPlayer]);

  // セルクリックハンドラー（メモ化）
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (disabled) return;

      // 合法手かどうかをチェック
      const isLegal = legalMoves.some((m) => m.row === row && m.col === col);

      if (isLegal) {
        // 合法手の場合は親コンポーネントに通知し、エラーをクリア
        onCellClick(row, col);
        // 既存のタイマーをクリア
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        setErrorMessage(null);
      } else {
        // 非合法手の場合はエラーメッセージを表示
        setErrorMessage('この位置には石を置けません');
        // 既存のタイマーをクリア
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        // 3秒後に自動的にエラーメッセージを消去
        errorTimeoutRef.current = setTimeout(() => {
          setErrorMessage(null);
        }, 3000);
      }
    },
    [disabled, legalMoves, onCellClick]
  );

  // マウスエンターハンドラー
  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoveredCell({ row, col });
  }, []);

  // マウスリーブハンドラー
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // キーボードハンドラー
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      // 現在のフォーカス位置を取得（なければ0,0から開始）
      const currentFocus = focusedCell ?? { row: 0, col: 0 };

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentFocus.row > 0) {
            setFocusedCell({ row: currentFocus.row - 1, col: currentFocus.col });
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (currentFocus.row < 7) {
            setFocusedCell({ row: currentFocus.row + 1, col: currentFocus.col });
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (currentFocus.col > 0) {
            setFocusedCell({ row: currentFocus.row, col: currentFocus.col - 1 });
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (currentFocus.col < 7) {
            setFocusedCell({ row: currentFocus.row, col: currentFocus.col + 1 });
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedCell) {
            handleCellClick(focusedCell.row, focusedCell.col);
          }
          break;

        default:
          break;
      }
    },
    [disabled, focusedCell, handleCellClick]
  );

  // 盤面がフォーカスされたときに最初のセルにフォーカスを設定
  const handleFocus = useCallback(() => {
    if (!focusedCell && !disabled) {
      setFocusedCell({ row: 0, col: 0 });
    }
  }, [focusedCell, disabled]);

  // 盤面からフォーカスが外れたときにフォーカス状態をクリア
  const handleBlur = useCallback(() => {
    setFocusedCell(null);
  }, []);

  return (
    <div className="inline-block">
      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
        >
          {errorMessage}
        </div>
      )}

      <div
        ref={boardRef}
        role="grid"
        aria-label="オセロの盤面"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="grid grid-cols-8 gap-0 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {boardState.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isLegal = legalMoves.some((m) => m.row === rowIndex && m.col === colIndex);
            const isSelected =
              selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex;
            const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
            const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;

            return (
              <BoardCell
                key={`${rowIndex}-${colIndex}`}
                row={rowIndex}
                col={colIndex}
                state={cell as 'empty' | 'black' | 'white'}
                isLegalMove={isLegal}
                isSelected={isSelected}
                isHovered={isHovered}
                isFocused={isFocused}
                onClick={handleCellClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                cellSize={responsiveCellSize}
                disabled={disabled}
              />
            );
          })
        )}
      </div>

      {/* No legal moves message */}
      {legalMoves.length === 0 && (
        <p className="mt-4 text-gray-600 text-center">置ける場所がありません</p>
      )}
    </div>
  );
});
