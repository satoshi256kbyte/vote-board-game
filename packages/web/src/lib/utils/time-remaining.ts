/**
 * 残り時間計算関数
 * 投票締切までの残り時間を計算し、表示用のテキストと色クラスを返す
 */

export interface TimeRemaining {
  hours: number;
  minutes: number;
  isExpired: boolean;
  displayText: string;
  colorClass: string;
}

/**
 * 投票締切までの残り時間を計算する
 *
 * @param deadline - 締切日時（ISO 8601形式）
 * @returns 残り時間情報オブジェクト
 *
 * Preconditions:
 * - deadline is a valid ISO 8601 timestamp string
 *
 * Postconditions:
 * - Returns an object with time remaining information
 * - When deadline is in the past, isExpired is true
 * - When deadline is less than 1 hour away, colorClass is 'text-red-500'
 * - When deadline is less than 24 hours away, colorClass is 'text-orange-500'
 * - displayText is in Japanese relative time format (e.g., "あと2時間30分")
 */
export function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  // 締切を過ぎている場合
  if (diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      isExpired: true,
      displayText: '締切済み',
      colorClass: 'text-gray-500',
    };
  }

  // ミリ秒を時間と分に変換
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 表示テキストを生成
  let displayText = 'あと';
  if (hours > 0) {
    displayText += `${hours}時間`;
  }
  if (minutes > 0 || hours === 0) {
    displayText += `${minutes}分`;
  }

  // 色クラスを決定
  let colorClass = 'text-gray-700'; // デフォルト（24時間以上）

  if (totalMinutes < 60) {
    // 1時間未満: 赤色
    colorClass = 'text-red-500';
  } else if (totalMinutes < 24 * 60) {
    // 24時間未満: オレンジ色
    colorClass = 'text-orange-500';
  }

  return {
    hours,
    minutes,
    isExpired: false,
    displayText,
    colorClass,
  };
}
