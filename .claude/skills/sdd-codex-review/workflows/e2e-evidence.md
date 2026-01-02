# E2Eエビデンス収集ワークフロー

本ドキュメントでは、`[E2E]` タグ付きセクションの**Codexレビュー承認後**のエビデンス収集フローを定義します。

---

## 概要

UIに関連するセクションでは、**Codexレビューで承認された後**に Playwright の `recordVideo` オプションを使用してE2Eテストを実行し、
**必ず画面録画を取得**します。スクリーンショットは補助的なエビデンスとして併用します。

### なぜレビュー後に実行するのか

1. **品質優先**: レビュー済みの承認されたコードでエビデンスを取得
2. **効率性**: レビューで修正が入る可能性があるため、レビュー前のE2Eは無駄になりうる
3. **エビデンス目的**: 最終的な品質保証済みコードの動作を記録する

### 目的

1. **品質保証**: 承認済み実装がUIとして正しく動作することを視覚的に確認
2. **エビデンス**: 納品物・ドキュメントとしての証跡
3. **デバッグ**: 将来の問題発生時の参照資料

---

## トリガー条件

### セクションレベルの検出

```
[E2E] タグ検出:
    セクション見出し: "## Section X: Name [E2E]"
                                        ^^^^^ このサフィックス
```

### 実行条件

```
FUNCTION shouldCollectE2EEvidence(sectionId):
    section = getSectionById(sectionId)

    // 1. Codexレビューで承認されていること（最重要）
    IF NOT sectionReviewApproved(sectionId):
        RETURN false

    // 2. E2Eが必要なセクションであること
    IF NOT section.e2e_required:
        RETURN false

    // 3. まだE2Eエビデンスが収集されていないこと
    IF section.e2e_evidence.status != "pending":
        RETURN false

    RETURN true
```

### 重要: レビュー承認が前提条件

E2Eエビデンス収集は**Codexレビューで APPROVED を取得した後**にのみ実行されます。
これにより、レビューで指摘された問題が修正された後の最終的なコードでエビデンスを取得できます。

---

## エビデンス収集フロー

### フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                    セクション完了                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Codexレビュー実行                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                APPROVED           NEEDS_REVISION
                    │                   │
                    │                   ▼
                    │         ┌─────────────────────┐
                    │         │  修正 → 再レビュー  │
                    │         └─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              shouldCollectE2EEvidence(sectionId)?               │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                   YES                          NO
                    │                           │
                    ▼                           ▼
┌───────────────────────────────┐   ┌─────────────────────────────┐
│  エビデンスディレクトリ作成    │   │  セクション完了             │
│  .context/e2e-evidence/...    │   │  次のセクションへ進行       │
└───────────────────────────────┘   └─────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────┐
│  Playwright 実行              │
│  - recordVideoオプション有効   │
│  - アプリケーションURL取得     │
│  - E2Eシナリオ実行            │
│  - 画面録画 + スクリーンショット│
└───────────────────────────────┘
                    │
           ┌───────┴───────┐
           │               │
        SUCCESS         FAILURE
           │               │
           ▼               ▼
┌─────────────────┐  ┌─────────────────┐
│ evidence保存    │  │ エラー記録      │
│ status: passed  │  │ status: failed  │
│ paths更新       │  │ 警告通知        │
└─────────────────┘  └─────────────────┘
           │               │
           └───────┬───────┘
                   │
                   ▼
┌───────────────────────────────┐
│  エビデンスディレクトリを     │
│  自動オープン (成功時のみ)    │
└───────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────┐
│  ユーザーへ結果報告            │
│  - エビデンスパス             │
│  - 収集結果サマリー            │
└───────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────┐
│  セクション完了               │
│  次のセクションへ進行         │
│  (E2E結果に関わらず続行)       │
└───────────────────────────────┘
```

---

## ディレクトリ構造

### エビデンス保存先

```
.context/
└── e2e-evidence/
    └── [feature-name]/
        └── [section-id]/
            ├── recording.webm              # 画面録画（必須）
            ├── step-01-initial.png         # 初期状態
            ├── step-02-action.png          # ユーザー操作後
            ├── step-03-validation.png      # バリデーション表示
            └── step-04-complete.png        # 完了状態
```

### 命名規則

| ファイル種別 | 命名パターン | 必須/任意 | 説明 |
|-------------|-------------|----------|------|
| 録画ファイル | `*.webm` | **必須** | Playwright `recordVideo` で取得。リネームは任意 |
| スクリーンショット | `step-NN-description.png` | 推奨 | 各ステップの状態（補助エビデンス） |

**録画ファイル名について**: Playwrightが生成するUUIDファイル名をそのまま使用してもOK。`recording.webm`へのリネームは一貫性のためのオプション。重要なのは`video_path`に正しいパスが記録されていること。

## 録画エビデンス（必須）

Playwrightの`recordVideo`オプションを使用して、必ず画面録画を取得すること。

### 設定例

```typescript
const context = await browser.newContext({
  recordVideo: {
    dir: '.context/e2e-evidence/[feature]/[section]/',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();

// ... シナリオ実行

// 録画オブジェクトを保持（context.close()前に取得必須）
const video = page.video();
await context.close();

// 録画パスを取得（context.close()後に解決される）
const videoPath = await video?.path();

// リネーム（オプション：一貫した命名のため）
if (videoPath) {
  const fs = require('fs');
  const targetPath = '.context/e2e-evidence/[feature]/[section]/recording.webm';
  fs.renameSync(videoPath, targetPath);
}
```

### 重要: Playwrightの録画ファイル名について

Playwrightの`recordVideo`は**ランダムなUUIDファイル名**（例: `abc123def.webm`）を生成します。
一貫した`recording.webm`という名前にするには：

1. `page.video()` で録画オブジェクトを取得（close前に必須）
2. `context.close()` で録画を確定
3. `video?.path()` でファイルパスを取得（close後）
4. 取得したパスを`recording.webm`にリネーム

**または**、リネームせずに実際のパスをそのまま`video_path`に記録してもOK。

### 必須事項

- 録画なしのエビデンスは不完全とみなす
- スクリーンショットは補助的なエビデンスとして併用
- `video_path` は必須フィールド（失敗時のみnull許容）

### .gitignore設定

```gitignore
# E2E Evidence (temporary files)
.context/
```

---

## Playwright 実行

### 前提条件

1. Playwright がインストールされていること
2. 対象アプリケーションがローカルで起動していること
3. アプリケーションURLが取得可能であること

### 実行手順

E2Eエビデンス収集は Playwright の以下の機能を使用：

```typescript
// 1. recordVideoオプション有効でブラウザ起動（1回だけ）
const context = await browser.newContext({
  recordVideo: {
    dir: '.context/e2e-evidence/[feature]/[section]/',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();

// 2. 全シナリオを同一context内で実行
await page.goto(APP_URL);
await page.screenshot({ path: 'step-01-initial.png' });
// ... 各操作ステップ
await page.screenshot({ path: 'step-02-action.png' });
// ... 次の操作
await page.screenshot({ path: 'step-03-complete.png' });

// 3. 録画オブジェクトを取得してから録画を確定
const video = page.video();
await context.close();

// 4. 録画パスを取得してリネーム
const videoPath = await video?.path();
const fs = require('fs');
const targetPath = '.context/e2e-evidence/[feature]/[section]/recording.webm';
if (videoPath) fs.renameSync(videoPath, targetPath);
```

### 重要: 1つのcontextで全シナリオを実行

- `browser.newContext()` は **1回だけ** 呼び出す
- 全シナリオを同一context内で順次実行
- 全シナリオ完了後に `context.close()` で録画を確定
- **context.close()をループ内で呼び出してはいけない**

### 録画について

Playwrightの`recordVideo`オプションを使用して、必ず画面録画を取得すること：

1. **録画ファイル**: UUIDで自動生成（リネームは任意、spec.jsonの`video_path`に実際のパスを記録）
2. **スクリーンショット**: 各操作ステップで補助エビデンスとして取得（推奨）

### シナリオ実行

```
FOR each e2e_scenario in section.e2e_scenarios:
    1. シナリオに基づいてアクションを実行
    2. 各アクション後にスクリーンショット取得
    3. エラー発生時は記録して次へ進む
```

---

## シナリオ定義

### tasks.mdでの記述形式

```markdown
### Task 2.1: Build login form
**Creates:** `src/components/LoginForm.tsx`
**E2E:** ログインフォーム表示、入力フィールド確認、送信ボタン動作

### Task 2.2: Add validation
**Creates:** `src/components/LoginForm.validation.ts`
**E2E:** 空入力エラー表示、不正形式エラー表示、成功時の遷移
```

### シナリオの解釈

`**E2E:**` の内容は読点（、）で区切られたアクション/検証ポイントとして解釈：

```json
{
  "task": "2.1",
  "scenario": "ログインフォーム表示、入力フィールド確認、送信ボタン動作",
  "actions": [
    { "step": 1, "description": "ログインフォーム表示" },
    { "step": 2, "description": "入力フィールド確認" },
    { "step": 3, "description": "送信ボタン動作" }
  ]
}
```

### 汎用シナリオ

`**E2E:**` が未定義の場合のフォールバック：

```json
{
  "actions": [
    { "step": 1, "description": "ページ初期表示" },
    { "step": 2, "description": "主要コンポーネント確認" },
    { "step": 3, "description": "基本インタラクション" }
  ]
}
```

---

## アプリケーションURL取得

### 優先順位

1. **spec.json指定**: `spec.app_url` が定義されていれば使用
2. **環境変数**: `APP_URL` 環境変数
3. **デフォルト**: `http://localhost:3000`
4. **ユーザー入力**: 上記すべて失敗時に確認

### spec.jsonでの定義

```json
{
  "feature_name": "user-dashboard",
  "app_url": "http://localhost:3000/dashboard",
  ...
}
```

---

## エラーハンドリング

### エラー種別と対応

| エラー種別 | 対応 | 継続可否 |
|-----------|------|---------|
| Playwright未インストール | 警告、スキップ | 続行 |
| アプリケーション未起動 | 警告、リトライ提案 | 続行 |
| 録画取得失敗 | 警告、スクリーンショットのみ | 続行 |
| スクリーンショット失敗 | 記録、次へ | 続行 |
| 全アクション失敗 | エラー記録 | 続行 |

### 重要: E2E失敗時もレビューは続行

```
E2Eエビデンス収集失敗 ≠ レビューブロック

理由:
1. E2Eはエビデンス目的であり、品質ゲートではない
2. Codexレビューで本質的な問題は検出可能
3. E2E失敗はユーザーに警告として通知
```

### エラー記録形式

```json
{
  "e2e_evidence": {
    "status": "failed",
    "video_path": null,
    "screenshots": [],
    "executed_at": "2025-12-30T12:00:00Z",
    "error_message": "Playwright接続失敗: Connection refused"
  }
}
```

---

## 結果の報告

### 成功時

```
## E2Eエビデンス収集完了

セクション: Section 2: User Dashboard [E2E]
ステータス: 成功

### 収集ファイル
録画:
  - `.context/e2e-evidence/user-dashboard/section-2-user-dashboard/recording.webm`

スクリーンショット:
  - `.context/e2e-evidence/user-dashboard/section-2-user-dashboard/step-01-initial.png`
  - `.context/e2e-evidence/user-dashboard/section-2-user-dashboard/step-02-action.png`
  - `.context/e2e-evidence/user-dashboard/section-2-user-dashboard/step-03-complete.png`

エビデンスを確認してください。
```

### 失敗時

```
## E2Eエビデンス収集警告

セクション: Section 2: User Dashboard [E2E]
ステータス: 失敗

### エラー内容
Playwright接続に失敗しました。

### 推奨アクション
1. アプリケーションが起動しているか確認してください
2. Playwrightが正しく設定されているか確認してください

Codexレビューは続行します。
```

---

## spec.json更新

### E2E成功時

```javascript
section.e2e_evidence = {
  status: "passed",
  video_path: ".context/e2e-evidence/[feature]/[section]/recording.webm",  // 必須
  screenshots: [
    ".context/e2e-evidence/[feature]/[section]/step-01-initial.png",
    ".context/e2e-evidence/[feature]/[section]/step-02-action.png"
  ],
  executed_at: new Date().toISOString(),
  error_message: null
};
```

### E2E失敗時

```javascript
section.e2e_evidence = {
  status: "failed",
  video_path: null,  // 失敗時のみnull許容
  screenshots: [], // 部分的に取得できた場合は含める
  executed_at: new Date().toISOString(),
  error_message: "エラーの詳細"
};
```

---

## 手動実行

### コマンド

```bash
/sdd-codex-review e2e-evidence [feature-name] [section-id]
```

### 用途

- 自動収集が失敗した場合の再実行
- 特定セクションのみ再収集
- デバッグ目的

---

## クリーンアップ

### ユーザー責任

エビデンスファイルの削除はユーザーの判断に委ねる：

```bash
# 全エビデンス削除
rm -rf .context/e2e-evidence/

# 特定フィーチャーのみ
rm -rf .context/e2e-evidence/[feature-name]/
```

### 推奨タイミング

- フィーチャー完全完了後
- ディスク容量が逼迫時
- 不要と判断した場合

---

## 統合フロー全体

```
┌────────────────────────────────────────────────────────────────────┐
│                      タスク実装完了                                  │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ セクション完了チェック │
                    └──────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │    Codexレビュー     │
                    │   (impl-section)     │
                    └──────────────────────┘
                                │
                      ┌─────────┴─────────┐
                      │                   │
                  APPROVED           NEEDS_REVISION
                      │                   │
                      │                   ▼
                      │         ┌─────────────────────┐
                      │         │  修正 → 再レビュー  │
                      │         └─────────────────────┘
                      │
                      ▼
              ┌─────────────────────────────────────┐
              │         E2E必要？ ([E2E]タグ)        │
              └─────────────────────────────────────┘
                      │                    │
                     YES                   NO
                      │                    │
                      ▼                    ▼
         ┌────────────────────────┐  ┌────────────────────────┐
         │ E2Eエビデンス収集      │  │ セクション完了         │
         │ (Playwright+録画)      │  │ 次のセクションへ       │
         └────────────────────────┘  └────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ エビデンス確認&報告    │
         └────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ セクション完了         │
         │ 次のセクションへ       │
         └────────────────────────┘
```
