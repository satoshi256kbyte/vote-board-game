---
inclusion: manual
---

# テーブル設計

DynamoDB Single Table Design を採用

## テーブル構成

### メインテーブル

- テーブル名: `VoteBoardGame`
- パーティションキー: `PK` (String)
- ソートキー: `SK` (String)
- 暗号化: 有効（AWS管理キー）
- キャパシティモード: On-Demand

### GSI (Global Secondary Index)

#### GSI1: ゲーム一覧取得用

- パーティションキー: `GSI1PK` (String)
- ソートキー: `GSI1SK` (String)
- 用途: ステータス別のゲーム一覧取得

#### GSI2: ユーザーの投票履歴取得用

- パーティションキー: `GSI2PK` (String)
- ソートキー: `GSI2SK` (String)
- 用途: ユーザーの投票履歴取得

## エンティティ設計

### ユーザー (User)

| 属性       | 型     | 説明                |
| :--------- | :----- | :------------------ |
| PK         | String | `USER#<userId>`     |
| SK         | String | `USER#<userId>`     |
| userId     | String | ユーザーID (UUID)   |
| email      | String | メールアドレス      |
| username   | String | ユーザー名          |
| iconUrl    | String | アイコン画像URL     |
| createdAt  | String | 作成日時 (ISO 8601) |
| updatedAt  | String | 更新日時 (ISO 8601) |
| entityType | String | `USER`              |

### ゲーム (Game)

| 属性        | 型     | 説明                                      |
| :---------- | :----- | :---------------------------------------- |
| PK          | String | `GAME#<gameId>`                           |
| SK          | String | `GAME#<gameId>`                           |
| GSI1PK      | String | `GAME#STATUS#<status>`                    |
| GSI1SK      | String | `<createdAt>`                             |
| gameId      | String | ゲームID (UUID)                           |
| gameType    | String | ゲーム種類 (`OTHELLO`)                    |
| status      | String | ステータス (`ACTIVE`, `FINISHED`)         |
| aiSide      | String | AIの手番 (`BLACK`, `WHITE`)               |
| currentTurn | Number | 現在のターン数                            |
| boardState  | String | 盤面状態 (JSON文字列)                     |
| winner      | String | 勝者 (`AI`, `COLLECTIVE`, `DRAW`, `null`) |
| createdAt   | String | 作成日時 (ISO 8601)                       |
| updatedAt   | String | 更新日時 (ISO 8601)                       |
| entityType  | String | `GAME`                                    |

### 手 (Move)

| 属性        | 型     | 説明                        |
| :---------- | :----- | :-------------------------- |
| PK          | String | `GAME#<gameId>`             |
| SK          | String | `MOVE#<turnNumber>`         |
| gameId      | String | ゲームID                    |
| turnNumber  | Number | ターン番号                  |
| side        | String | 手番 (`BLACK`, `WHITE`)     |
| position    | String | 位置 (例: `D3`)             |
| playedBy    | String | 実行者 (`AI`, `COLLECTIVE`) |
| candidateId | String | 採用された候補ID (UUID)     |
| createdAt   | String | 作成日時 (ISO 8601)         |
| entityType  | String | `MOVE`                      |

### 候補 (Candidate)

| 属性           | 型     | 説明                                       |
| :------------- | :----- | :----------------------------------------- |
| PK             | String | `GAME#<gameId>#TURN#<turnNumber>`          |
| SK             | String | `CANDIDATE#<candidateId>`                  |
| GSI2PK         | String | `USER#<userId>`                            |
| GSI2SK         | String | `CANDIDATE#<createdAt>`                    |
| candidateId    | String | 候補ID (UUID)                              |
| gameId         | String | ゲームID                                   |
| turnNumber     | Number | ターン番号                                 |
| position       | String | 位置 (例: `D3`)                            |
| description    | String | 説明文 (200文字以内)                       |
| voteCount      | Number | 投票数                                     |
| createdBy      | String | 作成者 (`AI`, `USER#<userId>`)             |
| status         | String | ステータス (`VOTING`, `CLOSED`, `ADOPTED`) |
| createdAt      | String | 作成日時 (ISO 8601)                        |
| votingDeadline | String | 投票締切日時 (ISO 8601)                    |
| entityType     | String | `CANDIDATE`                                |

### 投票 (Vote)

| 属性        | 型     | 説明                              |
| :---------- | :----- | :-------------------------------- |
| PK          | String | `GAME#<gameId>#TURN#<turnNumber>` |
| SK          | String | `VOTE#<userId>`                   |
| GSI2PK      | String | `USER#<userId>`                   |
| GSI2SK      | String | `VOTE#<createdAt>`                |
| gameId      | String | ゲームID                          |
| turnNumber  | Number | ターン番号                        |
| userId      | String | ユーザーID                        |
| candidateId | String | 投票した候補ID                    |
| createdAt   | String | 作成日時 (ISO 8601)               |
| updatedAt   | String | 更新日時 (ISO 8601)               |
| entityType  | String | `VOTE`                            |

### 解説 (Commentary)

| 属性        | 型     | 説明                      |
| :---------- | :----- | :------------------------ |
| PK          | String | `GAME#<gameId>`           |
| SK          | String | `COMMENTARY#<turnNumber>` |
| gameId      | String | ゲームID                  |
| turnNumber  | Number | ターン番号                |
| content     | String | 解説文                    |
| generatedBy | String | `AI`                      |
| createdAt   | String | 作成日時 (ISO 8601)       |
| entityType  | String | `COMMENTARY`              |

## アクセスパターン

### 1. ユーザー情報取得

```text
Query:
  PK = USER#<userId>
  SK = USER#<userId>
```

### 2. ゲーム一覧取得（ステータス別）

```txt
Query (GSI1):
  GSI1PK = GAME#STATUS#ACTIVE
  GSI1SK (降順)
```

### 3. ゲーム詳細取得

```txt
Query:
  PK = GAME#<gameId>
  SK = GAME#<gameId>
```

### 4. ゲームの手履歴取得

```txt
Query:
  PK = GAME#<gameId>
  SK begins_with MOVE#
```

### 5. 特定ターンの候補一覧取得

```txt
Query:
  PK = GAME#<gameId>#TURN#<turnNumber>
  SK begins_with CANDIDATE#
```

### 6. ユーザーの投票取得

```txt
Query:
  PK = GAME#<gameId>#TURN#<turnNumber>
  SK = VOTE#<userId>
```

### 7. ユーザーの投票履歴取得

```txt
Query (GSI2):
  GSI2PK = USER#<userId>
  GSI2SK begins_with VOTE#
```

### 8. ゲームの解説取得

```txt
Query:
  PK = GAME#<gameId>
  SK begins_with COMMENTARY#
```

## データ例

### ユーザー

```json
{
  "PK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "SK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "player1",
  "iconUrl": "https://example.com/icon.png",
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T10:00:00Z",
  "entityType": "USER"
}
```

### ゲーム

```json
{
  "PK": "GAME#456e7890-e89b-12d3-a456-426614174001",
  "SK": "GAME#456e7890-e89b-12d3-a456-426614174001",
  "GSI1PK": "GAME#STATUS#ACTIVE",
  "GSI1SK": "2025-02-19T10:00:00Z",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "gameType": "OTHELLO",
  "status": "ACTIVE",
  "aiSide": "BLACK",
  "currentTurn": 5,
  "boardState": "{\"board\":[[0,0,0,...],[...],...]}",
  "winner": null,
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T15:00:00Z",
  "entityType": "GAME"
}
```

### 候補

```json
{
  "PK": "GAME#456e7890-e89b-12d3-a456-426614174001#TURN#5",
  "SK": "CANDIDATE#789e0123-e89b-12d3-a456-426614174002",
  "candidateId": "789e0123-e89b-12d3-a456-426614174002",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "position": "D3",
  "description": "中央を制圧する手。相手の選択肢を制限できる。",
  "voteCount": 15,
  "createdBy": "AI",
  "status": "VOTING",
  "createdAt": "2025-02-19T15:00:00Z",
  "votingDeadline": "2025-02-20T00:00:00Z",
  "entityType": "CANDIDATE"
}
```

### 投票

```json
{
  "PK": "GAME#456e7890-e89b-12d3-a456-426614174001#TURN#5",
  "SK": "VOTE#123e4567-e89b-12d3-a456-426614174000",
  "GSI2PK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "GSI2SK": "VOTE#2025-02-19T16:00:00Z",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "candidateId": "789e0123-e89b-12d3-a456-426614174002",
  "createdAt": "2025-02-19T16:00:00Z",
  "updatedAt": "2025-02-19T16:00:00Z",
  "entityType": "VOTE"
}
```

## 注意事項

### トランザクション

- 投票の作成・更新と候補の投票数更新は TransactWriteItems で実行
- 1ユーザー1票の制約を保証

### TTL (Time To Live)

- 終了したゲームのデータは90日後に自動削除（オプション）
- TTL属性: `expiresAt` (Unix timestamp)

### 容量設計

- 初期: On-Demand モード
- 安定後: Provisioned モードへの移行を検討
- 想定: 1日あたり10,000リクエスト程度
