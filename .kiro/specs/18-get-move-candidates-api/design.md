# Design Document

## Overview

次の一手候補一覧取得APIは、投票対局アプリケーションにおいて、特定の対局の特定のターンに対する次の一手候補の一覧を取得するためのRESTful APIエンドポイントです。このAPIは、Honoフレームワークを使用してAWS Lambda上で実行され、DynamoDBから候補データを取得して、投票数の降順でソートされた候補一覧をJSON形式で返します。

このAPIは認証不要で、未認証ユーザーでも候補一覧を閲覧できるように設計されています。これにより、ユーザーは投票前に候補を確認し、どの候補に投票するかを検討できます。

## Architecture

### システム構成

```
Client (Web Browser)
    ↓ HTTPS GET Request
API Gateway (HTTP API)
    ↓ Proxy Integration
AWS Lambda (Hono App)
    ↓ Query Operation
DynamoDB (Single Table)
    ↓ Query Result
AWS Lambda (Hono App)
    ↓ JSON Response
Client (Web Browser)
```

### レイヤー構成

このAPIは、既存のアーキテクチャパターンに従い、以下のレイヤーで構成されます：

1. **ルーティングレイヤー** (`routes/candidates.ts`)
   - HTTPリクエストの受信とレスポンスの返却
   - パスパラメータのバリデーション
   - エラーハンドリング

2. **サービスレイヤー** (`services/candidate.ts`)
   - ビジネスロジックの実装
   - データの取得とソート処理
   - 存在チェックとエラー判定

3. **リポジトリレイヤー** (`lib/dynamodb/repositories/candidate.ts`)
   - DynamoDBへのデータアクセス
   - クエリ操作の実行
   - エンティティの変換

4. **スキーマレイヤー** (`schemas/candidate.ts`)
   - リクエストパラメータのバリデーション定義
   - Zodスキーマの定義

### データフロー

1. クライアントが `GET /api/games/:gameId/turns/:turnNumber/candidates` にリクエスト
2. ルーターがパスパラメータをバリデーション（Zodスキーマ使用）
3. サービスがゲームとターンの存在を確認
4. リポジトリがDynamoDBから候補一覧を取得
5. サービスが候補を投票数の降順でソート
6. ルーターがJSON形式でレスポンスを返却

## Components and Interfaces

### API Endpoint

#### GET /api/games/:gameId/turns/:turnNumber/candidates

特定の対局の特定のターンに対する次の一手候補の一覧を取得します。

**Path Parameters:**

| Parameter  | Type   | Required | Description | Validation        |
| ---------- | ------ | -------- | ----------- | ----------------- |
| gameId     | string | Yes      | 対局ID      | UUID v4形式       |
| turnNumber | number | Yes      | ターン番号  | 正の整数（0以上） |

**Request Example:**

```
GET /api/games/550e8400-e29b-41d4-a716-446655440000/turns/5/candidates
```

**Response (200 OK):**

```json
{
  "candidates": [
    {
      "candidateId": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
      "position": "3,4",
      "description": "中央を制圧する攻撃的な手。相手の選択肢を制限できます。",
      "voteCount": 42,
      "createdBy": "AI",
      "status": "VOTING",
      "votingDeadline": "2024-01-15T23:59:59.999Z",
      "createdAt": "2024-01-14T00:00:00.000Z"
    },
    {
      "candidateId": "p7q8r9s0-t1u2-3v4w-5x6y-7z8a9b0c1d2e",
      "position": "2,5",
      "description": "守備的な手。盤面の安定性を高めます。",
      "voteCount": 38,
      "createdBy": "USER#user-123",
      "status": "VOTING",
      "votingDeadline": "2024-01-15T23:59:59.999Z",
      "createdAt": "2024-01-14T01:30:00.000Z"
    }
  ]
}
```

**Response (400 Bad Request) - Validation Error:**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fields": {
      "gameId": "Invalid uuid"
    }
  }
}
```

**Response (404 Not Found) - Game Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Game not found"
}
```

**Response (404 Not Found) - Turn Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Turn not found"
}
```

**Response (500 Internal Server Error):**

```json
{
  "error": "INTERNAL_ERROR",
  "message": "Failed to retrieve candidates"
}
```

### Type Definitions

#### CandidateResponse

```typescript
interface CandidateResponse {
  candidateId: string; // UUID v4形式
  position: string; // "row,col" 形式（例: "3,4"）
  description: string; // 最大200文字
  voteCount: number; // 投票数（0以上）
  createdBy: string; // "AI" または "USER#<userId>"
  status: 'VOTING' | 'CLOSED' | 'ADOPTED';
  votingDeadline: string; // ISO 8601形式
  createdAt: string; // ISO 8601形式
}
```

#### GetCandidatesResponse

```typescript
interface GetCandidatesResponse {
  candidates: CandidateResponse[];
}
```

#### PathParams

```typescript
interface GetCandidatesPathParams {
  gameId: string; // UUID v4形式
  turnNumber: string; // 数値文字列（"0", "1", "2", ...）
}
```

### Service Interface

#### CandidateService

```typescript
class CandidateService {
  constructor(
    private candidateRepository: CandidateRepository,
    private gameRepository: GameRepository
  );

  /**
   * 候補一覧を取得
   * @param gameId - 対局ID
   * @param turnNumber - ターン番号
   * @returns 投票数降順でソートされた候補一覧
   * @throws GameNotFoundError - ゲームが存在しない場合
   * @throws TurnNotFoundError - ターンが存在しない場合
   */
  async listCandidates(
    gameId: string,
    turnNumber: number
  ): Promise<CandidateResponse[]>;
}
```

### Repository Interface

既存の `CandidateRepository` に以下のメソッドが既に実装されています：

```typescript
class CandidateRepository extends BaseRepository {
  /**
   * ターンに紐づく候補一覧を取得
   * @param gameId - 対局ID
   * @param turnNumber - ターン番号
   * @returns 候補エンティティの配列
   */
  async listByTurn(gameId: string, turnNumber: number): Promise<CandidateEntity[]>;
}
```

既存の `GameRepository` に以下のメソッドが既に実装されています：

```typescript
class GameRepository extends BaseRepository {
  /**
   * ゲームIDでゲームを取得
   * @param gameId - 対局ID
   * @returns ゲームエンティティ（存在しない場合はnull）
   */
  async getById(gameId: string): Promise<GameEntity | null>;
}
```

## Data Models

### DynamoDB Table Structure

このAPIは、既存のSingle Table Designパターンに従ったDynamoDBテーブルを使用します。

#### Candidate Entity

| Attribute      | Type   | Description                                       |
| -------------- | ------ | ------------------------------------------------- |
| PK             | String | `GAME#<gameId>#TURN#<turnNumber>`                 |
| SK             | String | `CANDIDATE#<candidateId>`                         |
| entityType     | String | `CANDIDATE`                                       |
| candidateId    | String | 候補ID（UUID v4）                                 |
| gameId         | String | 対局ID（UUID v4）                                 |
| turnNumber     | Number | ターン番号                                        |
| position       | String | 位置（"row,col"形式）                             |
| description    | String | 説明文（最大200文字）                             |
| voteCount      | Number | 投票数                                            |
| createdBy      | String | 作成者（"AI" または "USER#<userId>"）             |
| status         | String | ステータス（VOTING/CLOSED/ADOPTED）               |
| votingDeadline | String | 投票締切（ISO 8601形式）                          |
| createdAt      | String | 作成日時（ISO 8601形式）                          |
| updatedAt      | String | 更新日時（ISO 8601形式）                          |
| GSI2PK         | String | `USER#<userId>`（ユーザー作成の場合のみ）         |
| GSI2SK         | String | `CANDIDATE#<createdAt>`（ユーザー作成の場合のみ） |

#### Game Entity

| Attribute   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| PK          | String | `GAME#<gameId>`               |
| SK          | String | `GAME#<gameId>`               |
| entityType  | String | `GAME`                        |
| gameId      | String | 対局ID（UUID v4）             |
| gameType    | String | ゲーム種類（OTHELLO）         |
| status      | String | ステータス（ACTIVE/FINISHED） |
| currentTurn | Number | 現在のターン番号              |
| ...         | ...    | その他のゲーム属性            |

### Query Pattern

候補一覧の取得には、以下のDynamoDB Query操作を使用します：

```typescript
{
  TableName: "VoteBoardGameTable",
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": "GAME#<gameId>#TURN#<turnNumber>",
    ":sk": "CANDIDATE#"
  }
}
```

この設計により、特定のターンに紐づくすべての候補を効率的に取得できます。

### Data Transformation

DynamoDBから取得した `CandidateEntity` を、APIレスポンス用の `CandidateResponse` に変換します：

```typescript
function toCandidateResponse(entity: CandidateEntity): CandidateResponse {
  return {
    candidateId: entity.candidateId,
    position: entity.position,
    description: entity.description,
    voteCount: entity.voteCount,
    createdBy: entity.createdBy,
    status: entity.status,
    votingDeadline: entity.votingDeadline,
    createdAt: entity.createdAt,
  };
}
```

## Correctness Properties

_プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。本質的には、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械が検証可能な正確性の保証との橋渡しとなります。_

### Property 1: 候補一覧の取得

_For any_ 有効なgameIdとturnNumberに対して、APIはDynamoDBから該当するターンのすべての候補を取得し、レスポンスに含める

**Validates: Requirements 1.1**

### Property 2: 投票数降順ソート

_For any_ 候補一覧に対して、返される配列は投票数（voteCount）の降順でソートされている（i番目の候補のvoteCountは、i+1番目の候補のvoteCount以上である）

**Validates: Requirements 1.2**

### Property 3: 成功レスポンスの形式

_For any_ 有効なリクエストに対して、APIはステータスコード200を返し、Content-Type `application/json` を設定し、`{"candidates": [...]}` の構造を持つJSONレスポンスを返す

**Validates: Requirements 1.3, 1.4, 4.2, 4.3, 6.1, 6.2**

### Property 4: 候補オブジェクトの必須フィールド

_For any_ レスポンスに含まれる候補オブジェクトに対して、candidateId, position, description, voteCount, createdBy, status, votingDeadline, createdAt のすべてのフィールドが含まれている

**Validates: Requirements 1.5, 6.3**

### Property 5: 日時フィールドのISO 8601形式

_For any_ 候補オブジェクトの日時フィールド（votingDeadline, createdAt）に対して、値はISO 8601形式の文字列である

**Validates: Requirements 6.4**

### Property 6: gameIdバリデーションエラー

_For any_ UUID形式でないgameIdに対して、APIはステータスコード400のバリデーションエラーを返し、エラーメッセージとフィールド情報を含む

**Validates: Requirements 2.1, 2.3, 2.4**

### Property 7: turnNumberバリデーションエラー

_For any_ 正の整数でないturnNumberに対して、APIはステータスコード400のバリデーションエラーを返し、エラーメッセージとフィールド情報を含む

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 8: 存在しないゲームのエラー処理

_For any_ 存在しないgameIdに対して、APIはステータスコード404のNot Found Errorを返し、"Game not found" のエラーメッセージを含む

**Validates: Requirements 3.1, 3.3, 3.4**

### Property 9: 存在しないターンのエラー処理

_For any_ 存在するゲームの存在しないturnNumberに対して、APIはステータスコード404のNot Found Errorを返し、"Turn not found" のエラーメッセージを含む

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 10: 空の候補一覧の処理

_For any_ 候補が存在しないターンに対して、APIはステータスコード200を返し、空の配列 `{"candidates": []}` を返す

**Validates: Requirements 4.1, 4.3**

### Property 11: DynamoDBエラーの処理

_For any_ DynamoDBエラーが発生した場合に対して、APIはステータスコード500のInternal Errorを返し、エラーメッセージを含む

**Validates: Requirements 5.4**

### Property 12: CORSヘッダーの設定

_For any_ リクエストに対して、レスポンスには適切なCORSヘッダー（Access-Control-Allow-Origin等）が含まれている

**Validates: Requirements 7.1, 7.2**

### Property 13: 認証不要のアクセス

_For any_ 認証トークンなしのリクエストに対して、APIはリクエストを受け入れ、候補一覧を返す

**Validates: Requirements 8.1**

### Property 14: 認証状態に依存しないデータ

_For any_ gameIdとturnNumberに対して、認証済みユーザーのリクエストと未認証ユーザーのリクエストは同じ候補一覧を返す

**Validates: Requirements 8.2, 8.3**

## Error Handling

### エラーの種類と処理

このAPIは、以下の種類のエラーを適切に処理します：

#### 1. バリデーションエラー (400 Bad Request)

**発生条件:**

- gameIdがUUID v4形式でない
- turnNumberが正の整数でない（負の数、小数、文字列など）

**レスポンス形式:**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fields": {
      "gameId": "Invalid uuid",
      "turnNumber": "Expected number, received string"
    }
  }
}
```

**処理方法:**

- Zodスキーマによる自動バリデーション
- `zValidator` ミドルウェアがバリデーションエラーを検出
- カスタムエラーハンドラーがフィールドごとのエラーメッセージを生成

#### 2. Not Found エラー (404 Not Found)

**発生条件:**

- 指定されたgameIdの対局が存在しない
- 指定されたturnNumberのターンが存在しない（ゲームのcurrentTurnより大きい）

**レスポンス形式:**

```json
{
  "error": "NOT_FOUND",
  "message": "Game not found"
}
```

または

```json
{
  "error": "NOT_FOUND",
  "message": "Turn not found"
}
```

**処理方法:**

- サービスレイヤーでゲームの存在を確認
- ゲームが存在しない場合は `GameNotFoundError` をスロー
- ターンが存在しない場合（turnNumber > game.currentTurn）は `TurnNotFoundError` をスロー
- ルーターがエラーをキャッチして404レスポンスを返す

#### 3. Internal Server Error (500 Internal Server Error)

**発生条件:**

- DynamoDBへのアクセスエラー
- 予期しないシステムエラー

**レスポンス形式:**

```json
{
  "error": "INTERNAL_ERROR",
  "message": "Failed to retrieve candidates"
}
```

**処理方法:**

- try-catchブロックですべての予期しないエラーをキャッチ
- エラーログを出力（CloudWatch Logsに記録）
- 本番環境では詳細なエラーメッセージを隠蔽
- 開発環境ではデバッグ用の詳細情報を含める

### エラーログ

すべてのエラーは、以下の形式でCloudWatch Logsに記録されます：

```typescript
console.error('Failed to retrieve candidates', {
  error: error instanceof Error ? error.message : 'Unknown error',
  gameId,
  turnNumber,
  timestamp: new Date().toISOString(),
});
```

### エラーハンドリングのベストプラクティス

1. **早期バリデーション**: リクエストを受け取った時点でパラメータをバリデーション
2. **明確なエラーメッセージ**: ユーザーが問題を理解できるメッセージを提供
3. **セキュリティ**: 本番環境では内部実装の詳細を露出しない
4. **ログ記録**: すべてのエラーをログに記録してトラブルシューティングを容易に
5. **一貫性**: 既存のAPIエンドポイントと同じエラーフォーマットを使用

## Testing Strategy

このAPIの正確性を保証するため、ユニットテストとプロパティベーステストの両方を実装します。

### テストアプローチ

#### ユニットテスト

ユニットテストは、特定の例やエッジケース、統合ポイントを検証します：

**対象:**

- 特定のバリデーションエラーケース（空文字列、不正な形式など）
- 特定のエラーレスポンスの形式
- モックを使用したリポジトリとの統合
- エッジケース（候補が0件、1件、多数の場合）

**テストファイル:**

- `routes/candidates.test.ts` - ルーティングレイヤーのユニットテスト
- `services/candidate.test.ts` - サービスレイヤーのユニットテスト
- `routes/candidates.integration.test.ts` - 統合テスト

**例:**

```typescript
describe('GET /api/games/:gameId/turns/:turnNumber/candidates', () => {
  it('should return 400 when gameId is not UUID', async () => {
    const res = await app.request('/api/games/invalid-id/turns/1/candidates');
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('should return empty array when no candidates exist', async () => {
    // モックで空の配列を返すように設定
    const res = await app.request('/api/games/valid-uuid/turns/1/candidates');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.candidates).toEqual([]);
  });
});
```

#### プロパティベーステスト

プロパティベーステストは、すべての入力に対して成り立つべき普遍的なプロパティを検証します：

**対象:**

- 投票数降順ソートの不変性
- レスポンス形式の一貫性
- 必須フィールドの存在
- バリデーションルールの網羅性

**テストライブラリ:**

- fast-check（JavaScriptのプロパティベーステストライブラリ）

**設定:**

- 各プロパティテストは最低100回のイテレーションを実行
- `numRuns: 10-20`（JSDOM環境での安定性のため）
- `endOnFailure: true`（失敗時に即座に停止）

**テストファイル:**

- `routes/candidates.property.test.ts` - プロパティベーステスト

**例:**

```typescript
import fc from 'fast-check';

describe('Property: 投票数降順ソート', () => {
  it('should always return candidates sorted by voteCount in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            candidateId: fc.uuid(),
            voteCount: fc.nat(),
            // ... other fields
          })
        ),
        (candidates) => {
          // モックでこの候補一覧を返すように設定
          const sorted = sortByVoteCount(candidates);

          // すべての隣接ペアで降順を確認
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].voteCount).toBeGreaterThanOrEqual(sorted[i + 1].voteCount);
          }
        }
      ),
      { numRuns: 100, endOnFailure: true }
    );
  });
});
```

**プロパティテストのタグ付け:**

各プロパティテストには、設計ドキュメントのプロパティを参照するコメントを付けます：

```typescript
/**
 * Feature: get-move-candidates-api, Property 2: 投票数降順ソート
 * For any 候補一覧に対して、返される配列は投票数（voteCount）の降順でソートされている
 */
it('should always return candidates sorted by voteCount in descending order', () => {
  // ...
});
```

### テストカバレッジ目標

- ユニットテスト: 80%以上のコードカバレッジ
- プロパティテスト: すべての設計プロパティをカバー
- 統合テスト: 主要なエンドツーエンドシナリオをカバー

### テスト実行

```bash
# すべてのテストを実行
pnpm test

# 特定のファイルのテストを実行
pnpm test candidates

# カバレッジレポートを生成
pnpm test:coverage
```

### CI/CD統合

GitHub Actionsで以下のテストを自動実行：

1. Lint / Type Check
2. ユニットテスト
3. プロパティベーステスト
4. 統合テスト

すべてのテストが成功した場合のみ、デプロイを許可します。
