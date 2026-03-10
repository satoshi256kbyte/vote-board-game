/**
 * CandidateForm Component
 *
 * Client Component for submitting move candidates.
 * Allows users to select a position on the board, enter a description,
 * preview the move, and submit the candidate.
 *
 * Requirements: 1.1-26.10
 */

'use client';

import React, { useState, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Board } from '@/components/board';
import { BoardPreview } from '@/app/games/[gameId]/_components/board-preview';
import { createCandidate } from '@/lib/api/candidates';
import { ApiError } from '@/lib/api/client';
import { candidateFormSchema } from '@/lib/validation/candidate-form-schema';
import type { BoardState } from '@/types/game';

/**
 * Props for CandidateForm component
 */
interface CandidateFormProps {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ターン番号 */
  turnNumber: number;
  /** 現在の盤面状態 */
  currentBoardState: BoardState;
  /** 現在のプレイヤー（'black' または 'white'） */
  currentPlayer: 'black' | 'white';
}

/**
 * CandidateForm Component
 *
 * 候補投稿フォームを表示します。
 * ユーザーは盤面上でセルをクリックして位置を選択し、
 * 説明文を入力してから候補を投稿できます。
 */
export function CandidateForm({ gameId, turnNumber, currentBoardState }: CandidateFormProps) {
  const router = useRouter();

  // フォーム状態管理
  const [selectedPosition, setSelectedPosition] = useState<{ row: number; col: number } | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    position?: string;
    description?: string;
  }>({});

  /**
   * セルクリックハンドラー
   * 位置を選択し、位置エラーをクリアします
   */
  const handleCellClick = (row: number, col: number): void => {
    // 送信中は操作不可
    if (isSubmitting) return;

    // 選択位置の更新
    setSelectedPosition({ row, col });

    // 位置エラーのクリア
    if (validationErrors.position) {
      setValidationErrors((prev) => ({ ...prev, position: undefined }));
    }
  };

  /**
   * 説明文入力ハンドラー
   * リアルタイムバリデーションを実行します
   */
  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;

    // 状態更新
    setDescription(value);

    // リアルタイムバリデーション
    if (value.length > 200) {
      setValidationErrors((prev) => ({
        ...prev,
        description: '説明文は200文字以内で入力してください',
      }));
    } else if (validationErrors.description) {
      setValidationErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  /**
   * キャンセルボタンハンドラー
   * 前のページに戻ります
   */
  const handleCancel = (): void => {
    router.back();
  };

  /**
   * フォーム送信ハンドラー
   * バリデーション、API呼び出し、エラーハンドリングを実行します
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // Step 1: 初期化
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    // Step 2: 位置選択チェック
    if (!selectedPosition) {
      setValidationErrors({ position: '位置を選択してください' });
      setIsSubmitting(false);
      return;
    }

    // Step 3: フォームデータ構築
    const formData = {
      position: `${selectedPosition.row},${selectedPosition.col}`,
      description: description.trim(),
    };

    // Step 4: バリデーション
    const validation = candidateFormSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setValidationErrors({
        position: errors.position?.[0],
        description: errors.description?.[0],
      });
      setIsSubmitting(false);
      return;
    }

    // Step 5: API 呼び出し
    try {
      await createCandidate(gameId, turnNumber, formData.position, formData.description);

      // Step 6: 成功時のリダイレクト
      router.push(`/games/${gameId}`);
    } catch (error) {
      // Step 7: エラーハンドリング
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          setError('認証が必要です。ログインしてください。');
        } else if (error.statusCode === 409) {
          setError('この位置の候補は既に存在します。別の位置を選択してください。');
        } else if (error.statusCode === 400 && error.code === 'INVALID_MOVE') {
          setError('この位置には石を置けません。別の位置を選択してください。');
        } else if (error.statusCode === 400 && error.code === 'VOTING_CLOSED') {
          setError('投票期間が終了しています。');
        } else {
          setError('候補の投稿に失敗しました。もう一度お試しください。');
        }
      } else {
        setError('予期しないエラーが発生しました。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 選択位置を "D3" 形式に変換
   */
  const highlightPosition = useMemo(() => {
    if (!selectedPosition) return undefined;
    const col = String.fromCharCode(65 + selectedPosition.col); // 0->A, 1->B, ...
    const row = (selectedPosition.row + 1).toString(); // 0->1, 1->2, ...
    return `${col}${row}`;
  }, [selectedPosition]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" role="form">
      {/* エラー表示 */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 盤面選択 */}
      <div>
        <div className="block text-sm font-medium mb-2" id="board-selection-label">
          位置を選択してください
        </div>
        <div aria-labelledby="board-selection-label">
          <Board
            boardState={currentBoardState}
            onCellClick={handleCellClick}
            highlightedCell={selectedPosition ?? undefined}
          />
        </div>
        {validationErrors.position && (
          <p className="text-red-600 text-sm mt-1" role="alert">
            {validationErrors.position}
          </p>
        )}
      </div>

      {/* プレビュー */}
      {selectedPosition && (
        <div>
          <label className="block text-sm font-medium mb-2">プレビュー</label>
          <BoardPreview
            boardState={currentBoardState.board.map((row) => row.map((cell) => cell.toString()))}
            highlightPosition={highlightPosition}
          />
        </div>
      )}

      {/* 説明文入力 */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          説明文（最大200文字）
        </label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={200}
          placeholder="この手の狙いや効果を説明してください"
          aria-describedby="description-count description-error"
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <span id="description-count" className="text-sm text-gray-500">
            {description.length}/200文字
          </span>
          {validationErrors.description && (
            <p id="description-error" className="text-red-600 text-sm" role="alert">
              {validationErrors.description}
            </p>
          )}
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? '送信中...' : '候補を投稿'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
