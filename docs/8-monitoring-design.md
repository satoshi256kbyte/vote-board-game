# モニタリング・アラート設計

## 概要

投票対局システムの可用性、パフォーマンス、エラーを監視し、問題発生時に迅速に対応できるようにする。

## モニタリング方針

### 基本方針

- **予防的監視**: 問題が深刻化する前に検知
- **ユーザー影響優先**: ユーザー体験に影響する問題を最優先
- **段階的アラート**: 環境ごとに適切なアラート設定
- **コスト最適化**: MVP では必要最小限のメトリクスに絞る

### 環境別アラート設定

| 環境        | アラート通知 | 重要度   | 対応時間   |
| ----------- | ------------ | -------- | ---------- |
| Production  | SNS → Email  | Critical | 即時       |
| Staging     | SNS → Email  | Warning  | 営業時間内 |
| Development | ログのみ     | Info     | 任意       |

## 監視対象とメトリクス

### 1. Lambda 関数（API）

#### メトリクス

| メトリクス           | 説明               | 閾値     | アラート条件    |
| -------------------- | ------------------ | -------- | --------------- |
| Errors               | エラー発生回数     | 10回/5分 | 5分間で10回以上 |
| Throttles            | スロットリング回数 | 5回/5分  | 5分間で5回以上  |
| Duration             | 実行時間           | 25秒     | p99が25秒以上   |
| ConcurrentExecutions | 同時実行数         | 800      | 800以上         |
| Invocations          | 呼び出し回数       | -        | 監視のみ        |

#### アラート設定

**Critical: API Lambda エラー率上昇**

```text
条件: Errors / Invocations > 5% が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: 即時調査・対応
```

**Warning: API Lambda 実行時間超過**

```text
条件: Duration p99 > 25秒 が 3 データポイント連続
期間: 5分
通知: Production のみ
アクション: パフォーマンス調査
```

**Warning: API Lambda スロットリング発生**

```text
条件: Throttles > 5 が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: 同時実行数の上限確認・調整
```

### 2. Lambda 関数（Batch）

#### メトリクス

| メトリクス  | 説明           | 閾値 | アラート条件 |
| ----------- | -------------- | ---- | ------------ |
| Errors      | エラー発生回数 | 1回  | 1回でも発生  |
| Duration    | 実行時間       | 4分  | 4分以上      |
| Invocations | 呼び出し回数   | -    | 監視のみ     |

#### アラート設定

**Critical: Batch Lambda 実行失敗**

```text
条件: Errors >= 1
期間: 5分
通知: Production のみ
アクション: 即時調査・手動実行検討
```

**Warning: Batch Lambda 実行時間超過**

````text
条件: Duration > 4分
期間: 5分
通知: Production のみ
アクション: 処理最適化検討
```

### 3. API Gateway

#### メトリクス

| メトリクス | 説明 | 閾値 | アラート条件 |
|-----------|------|------|------------|
| 4XXError | クライアントエラー | 100回/5分 | 5分間で100回以上 |
| 5XXError | サーバーエラー | 10回/5分 | 5分間で10回以上 |
| Latency | レイテンシ | 3秒 | p99が3秒以上 |
| Count | リクエスト数 | - | 監視のみ |

#### アラート設定

**Critical: API Gateway 5XX エラー多発**

```text
条件: 5XXError > 10 が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: Lambda・DynamoDB の状態確認
````

**Warning: API Gateway 4XX エラー多発**

```text
条件: 4XXError > 100 が 3 データポイント連続
期間: 5分
通知: Production のみ
アクション: クライアント側の問題調査
```

**Warning: API Gateway レイテンシ上昇**

```text
条件: Latency p99 > 3秒 が 3 データポイント連続
期間: 5分
通知: Production のみ
アクション: バックエンド処理の最適化検討
```

### 4. DynamoDB

#### メトリクス

| メトリクス                 | 説明                 | 閾値     | アラート条件    |
| -------------------------- | -------------------- | -------- | --------------- |
| UserErrors                 | ユーザーエラー       | 10回/5分 | 5分間で10回以上 |
| SystemErrors               | システムエラー       | 1回/5分  | 5分間で1回以上  |
| ConsumedReadCapacityUnits  | 読み込みキャパシティ | -        | 監視のみ        |
| ConsumedWriteCapacityUnits | 書き込みキャパシティ | -        | 監視のみ        |
| SuccessfulRequestLatency   | リクエストレイテンシ | 100ms    | p99が100ms以上  |

#### アラート設定

**Critical: DynamoDB システムエラー発生**

```text
条件: SystemErrors >= 1
期間: 5分
通知: Production のみ
アクション: AWS サービス状態確認・即時調査
```

**Warning: DynamoDB ユーザーエラー多発**

```text
条件: UserErrors > 10 が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: アプリケーションコードの確認
```

**Warning: DynamoDB レイテンシ上昇**

```text
条件: SuccessfulRequestLatency p99 > 100ms が 3 データポイント連続
期間: 5分
通知: Production のみ
アクション: インデックス・クエリの最適化検討
```

### 5. CloudFront

#### メトリクス

| メトリクス    | 説明               | 閾値 | アラート条件 |
| ------------- | ------------------ | ---- | ------------ |
| 4xxErrorRate  | 4XX エラー率       | 5%   | 5%以上       |
| 5xxErrorRate  | 5XX エラー率       | 1%   | 1%以上       |
| OriginLatency | オリジンレイテンシ | 1秒  | p99が1秒以上 |
| Requests      | リクエスト数       | -    | 監視のみ     |

#### アラート設定

**Critical: CloudFront 5XX エラー率上昇**

```text
条件: 5xxErrorRate > 1% が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: S3・オリジンの状態確認
```

**Warning: CloudFront 4XX エラー率上昇**

```text
条件: 4xxErrorRate > 5% が 3 データポイント連続
期間: 5分
通知: Production のみ
アクション: 存在しないページへのアクセス調査
```

### 6. Cognito

#### メトリクス

| メトリクス                | 説明             | 閾値     | アラート条件    |
| ------------------------- | ---------------- | -------- | --------------- |
| UserAuthenticationFailure | 認証失敗         | 50回/5分 | 5分間で50回以上 |
| TokenRefreshFailure       | トークン更新失敗 | 10回/5分 | 5分間で10回以上 |

#### アラート設定

**Warning: Cognito 認証失敗多発**

```text
条件: UserAuthenticationFailure > 50 が 2 データポイント連続
期間: 5分
通知: Production のみ
アクション: 不正アクセスの可能性を調査
```

### 7. EventBridge Scheduler

#### メトリクス

| メトリクス             | 説明                 | 閾値 | アラート条件 |
| ---------------------- | -------------------- | ---- | ------------ |
| TargetErrorCount       | ターゲット実行エラー | 1回  | 1回でも発生  |
| InvocationAttemptCount | 実行試行回数         | -    | 監視のみ     |

#### アラート設定

**Critical: EventBridge Scheduler 実行失敗**

```text
条件: TargetErrorCount >= 1
期間: 5分
通知: Production のみ
アクション: Batch Lambda の状態確認・手動実行
```

## カスタムメトリクス

### アプリケーションレベルのメトリクス

#### 1. ビジネスメトリクス

| メトリクス             | 説明               | 収集方法                             | 用途     |
| ---------------------- | ------------------ | ------------------------------------ | -------- |
| VoteCount              | 投票数             | Lambda から CloudWatch Logs Insights | 日次集計 |
| ActiveGames            | アクティブな対局数 | Lambda から CloudWatch Logs Insights | 監視     |
| CandidateCreationCount | 候補作成数         | Lambda から CloudWatch Logs Insights | 日次集計 |
| UserRegistrationCount  | ユーザー登録数     | Cognito メトリクス                   | 日次集計 |

#### 2. パフォーマンスメトリクス

| メトリクス            | 説明                   | 収集方法    | 閾値  |
| --------------------- | ---------------------- | ----------- | ----- |
| DynamoDBQueryDuration | DynamoDB クエリ時間    | X-Ray       | 50ms  |
| BedrockAPILatency     | Bedrock API レイテンシ | X-Ray       | 5秒   |
| VoteProcessingTime    | 投票処理時間           | Lambda ログ | 500ms |

## ログ管理

### ログ保持期間

| ログ種別         | 保持期間 | 理由               |
| ---------------- | -------- | ------------------ |
| Lambda ログ      | 7日      | MVP ではコスト優先 |
| API Gateway ログ | 7日      | MVP ではコスト優先 |
| CloudFront ログ  | 30日     | アクセス分析用     |

### ログレベル

| 環境        | ログレベル | 出力内容                 |
| ----------- | ---------- | ------------------------ |
| Production  | INFO       | エラー、警告、重要な情報 |
| Staging     | DEBUG      | 詳細なデバッグ情報       |
| Development | DEBUG      | すべての情報             |

### 構造化ログフォーマット

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "service": "api",
  "function": "vote",
  "requestId": "xxx-xxx-xxx",
  "userId": "user-123",
  "gameId": "game-456",
  "message": "Vote processed successfully",
  "duration": 123,
  "metadata": {
    "candidateId": "candidate-789"
  }
}
```

## ダッシュボード

### 統合監視ダッシュボード

**目的**: システム全体の健全性とパフォーマンスを一画面で確認

#### ブロック1: システム概要

- API Gateway リクエスト数（時系列）
- Lambda エラー率（時系列）
- DynamoDB レイテンシ（時系列）
- CloudFront リクエスト数（時系列）
- アクティブユーザー数（数値）
- 現在のアラート状態（リスト）

#### ブロック2: API パフォーマンス

- API Gateway レイテンシ（p50, p99, p99.9）
- Lambda 実行時間（p50, p99, p99.9）
- Lambda 同時実行数（時系列）
- API エンドポイント別リクエスト数（棒グラフ）
- エラー率（時系列）

#### ブロック3: バッチ処理

- Batch Lambda 実行状態（成功/失敗）
- Batch Lambda 実行時間（時系列）
- 投票集計結果（数値）
- AI 候補生成数（数値）
- EventBridge Scheduler 実行履歴（リスト）

#### ブロック4: ビジネスメトリクス

- 日次投票数（時系列）
- アクティブ対局数（時系列）
- ユーザー登録数（時系列）
- 候補作成数（時系列）
- 人気の対局ランキング（リスト）

## アラート通知設定

### SNS トピック構成

| トピック名               | 用途                       | サブスクリプション |
| ------------------------ | -------------------------- | ------------------ |
| vbg-prod-critical-alerts | 本番環境の重大アラート     | Email              |
| vbg-prod-warning-alerts  | 本番環境の警告アラート     | Email              |
| vbg-stg-alerts           | ステージング環境のアラート | Email              |

### Email 通知フォーマット

```text
🚨 [CRITICAL] API Lambda エラー率上昇

環境: Production
サービス: API Lambda
メトリクス: Error Rate
現在値: 8.5%
閾値: 5%
期間: 2024-01-01 12:00 - 12:05

詳細: https://console.aws.amazon.com/cloudwatch/...
ダッシュボード: https://console.aws.amazon.com/cloudwatch/...
```

## X-Ray トレーシング

### トレース対象

- API Lambda 関数
- Batch Lambda 関数
- DynamoDB クエリ
- Bedrock API 呼び出し（将来）

### サンプリングレート

| 環境        | サンプリングレート | 理由                       |
| ----------- | ------------------ | -------------------------- |
| Production  | 5%                 | コストとデータ量のバランス |
| Staging     | 100%               | 詳細な分析のため           |
| Development | 100%               | デバッグのため             |

### トレース分析

- レイテンシの高いリクエストの特定
- エラーの根本原因分析
- サービス間の依存関係の可視化
- ボトルネックの特定

## コスト最適化

### MVP でのコスト削減策

1. **ログ保持期間の短縮**: 7日間に設定
2. **メトリクスの絞り込み**: 必要最小限のメトリクスのみ
3. **アラートの最適化**: Production のみ通知
4. **X-Ray サンプリング**: 5%に設定
5. **カスタムメトリクスの制限**: ビジネスクリティカルなもののみ

### 想定コスト（月額）

| サービス              | 項目                       | 想定コスト |
| --------------------- | -------------------------- | ---------- |
| CloudWatch Logs       | ログ保存（7日）            | $5         |
| CloudWatch Metrics    | カスタムメトリクス         | $3         |
| CloudWatch Alarms     | アラーム（10個）           | $1         |
| CloudWatch Dashboards | ダッシュボード（1個）      | $3         |
| X-Ray                 | トレース（5%サンプリング） | $2         |
| **合計**              |                            | **$14**    |

## 運用フロー

### アラート対応フロー

1. **アラート受信**
   - SNS → Email で通知
   - アラート内容を確認

2. **初期調査**
   - ダッシュボードで全体状況を確認
   - CloudWatch Logs で詳細ログを確認
   - X-Ray でトレースを確認

3. **対応判断**
   - Critical: 即時対応
   - Warning: 営業時間内に対応
   - Info: 次回メンテナンス時に対応

4. **対応実施**
   - 問題の修正
   - 動作確認
   - アラート解除確認

5. **事後対応**
   - インシデントレポート作成
   - 再発防止策の検討
   - アラート設定の見直し

### 定期レビュー

| 頻度   | 内容                                 |
| ------ | ------------------------------------ |
| 日次   | ダッシュボード確認、アラート履歴確認 |
| 週次   | パフォーマンストレンド分析           |
| 月次   | コスト分析、アラート設定見直し       |
| 四半期 | 監視戦略の見直し                     |

## 将来の拡張

### MVP 後の追加監視項目

1. **リアルタイムユーザー監視**
   - アクティブユーザー数
   - セッション時間
   - ページビュー

2. **セキュリティ監視**
   - 不正アクセス検知
   - DDoS 攻撃検知
   - 異常なトラフィックパターン

3. **ビジネスアラート**
   - 投票数の異常な減少
   - 対局の異常な増加
   - ユーザー登録の急増

4. **外部サービス監視**
   - Bedrock API の可用性
   - サードパーティ API のレイテンシ

5. **合成モニタリング**
   - 定期的なヘルスチェック
   - エンドツーエンドのシナリオテスト

6. **通知の拡張**
   - Slack 通知の追加
   - PagerDuty などのインシデント管理ツール連携

## まとめ

MVP では以下に注力:

- Lambda、API Gateway、DynamoDB の基本的な監視
- Critical なアラートのみ通知
- コストを抑えた設定（月額 $14 程度）
- シンプルな統合ダッシュボード（1つ、4ブロック構成）

本番運用開始後、実際のトラフィックとアラート頻度を見ながら、段階的に監視項目とアラート設定を最適化していく。
