# 要件: 投票状況取得 API

## 要件

### 1. 認証

- 1.1 GET /games/:gameId/turns/:turnNumber/votes/me エンドポイントは認証が必須であること
- 1.2 認証トークンが存在しないまたは無効な場合、ステータスコード401とエラーコード `UNAUTHORIZED` を返すこと

### 2. パスパラメータのバリデーション

- 2.1 gameId がUUID v4形式でない場合、ステータスコード400とエラーコード `VALIDATION_ERROR` を返すこと
- 2.2 turnNumber が0以上の整数でない場合、ステータスコード400とエラーコード `VALIDATION_ERROR` を返すこと
- 2.3 バリデーションエラーのレスポンスは `{ error, message, details: { fields } }` の構造を持つこと

### 3. 投票未存在時の処理

- 3.1 指定されたゲーム・ターンにユーザーの投票が存在しない場合、ステータスコード404を返すこと
- 3.2 404レスポンスのボディは `{ error: "NOT_FOUND", message: "Vote not found" }` であること

### 4. 成功レスポンス

- 4.1 投票が存在する場合、ステータスコード200を返すこと
- 4.2 レスポンスに gameId, turnNumber, userId, candidateId, createdAt, updatedAt のすべてのフィールドを含むこと
- 4.3 createdAt と updatedAt はISO 8601形式であること
- 4.4 VoteEntity の updatedAt が未定義の場合、createdAt の値をフォールバックとして使用すること

### 5. 読み取り専用

- 5.1 GETリクエストはDynamoDBへの書き込み操作を一切行わないこと

### 6. エラーレスポンスの一貫性

- 6.1 すべてのエラーレスポンスは `{ error: string, message: string }` の構造を持つこと
- 6.2 エラーの種類に応じた適切なHTTPステータスコードが設定されること（401: 認証エラー、400: バリデーションエラー、404: 未存在、500: 内部エラー）
