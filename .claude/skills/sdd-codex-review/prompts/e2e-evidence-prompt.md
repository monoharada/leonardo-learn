# E2Eエビデンス収集プロンプト

このファイルはPlaywrightを使用してE2Eエビデンス（画面録画とスクリーンショット）を収集するためのプロンプトテンプレートです。

## 重要: 実行方法

**このプロンプトは Claude Code が Playwright を使用して実行します。**
- `recordVideo`オプションを有効にしてブラウザを起動（必須）
- 各ステップでスクリーンショットを取得（補助）
- 結果を `.context/e2e-evidence/` に保存

---

## プロンプト

```
あなたはE2Eテストエンジニアです。
Playwright（recordVideoオプション有効）を使用して、以下のセクションのE2Eエビデンスを収集してください。

## 対象セクション

**セクション名**: {{SECTION_NAME}}
**セクションID**: {{SECTION_ID}}
**フィーチャー名**: {{FEATURE_NAME}}

## E2Eシナリオ

{{E2E_SCENARIOS}}

## アプリケーション情報

**URL**: {{APP_URL}}

## エビデンス保存先

**ディレクトリ**: {{EVIDENCE_DIR}}
例: `.context/e2e-evidence/{{FEATURE_NAME}}/{{SECTION_ID}}/`

## 実行手順

### 1. 準備

1. エビデンス保存ディレクトリを作成
2. **recordVideoオプション有効でブラウザを起動**（必須）:

```typescript
const context = await browser.newContext({
  recordVideo: {
    dir: '{{EVIDENCE_DIR}}',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();
```

### 2. シナリオ実行

**重要**: 1つのcontextで全シナリオを実行し、最後に1回だけcontext.close()を呼び出す。

```
// 同一context内で全シナリオを順次実行
FOR each scenario in E2E_SCENARIOS:
    1. アプリケーションURLに遷移
    2. 初期状態のスクリーンショット取得
    3. シナリオのアクションを順次実行:
       - 要素のクリック
       - テキスト入力
       - フォーム送信
    4. 各アクション後にスクリーンショット取得
    5. 最終状態のスクリーンショット取得
    // context.close()はここで呼ばない！

// 全シナリオ完了後に録画を確定
6. **page.video()で録画オブジェクトを取得**（close前に必須）
7. **context.close()で録画を保存**（必須・1回のみ）
8. **video?.path()で録画パスを取得**（close後）
9. 取得したパスを`recording.webm`にリネーム、またはUUIDファイル名のまま`video_path`に記録
```

### 3. スクリーンショット命名規則

```
step-NN-description.png

例:
step-01-initial.png            # 初期表示
step-02-action.png             # アクション後
step-03-validation.png         # バリデーション表示
step-04-complete.png           # 最終状態
```

**注意**: 命名は `step-NN-description.png` 形式に統一。description は英小文字とハイフンのみ使用。

### 4. 結果報告

収集完了後、以下の情報を報告:

```
## E2Eエビデンス収集完了

### セクション情報
- セクション: {{SECTION_NAME}}
- 実行日時: [timestamp]

### 収集ファイル
録画:
  - `*.webm` - 画面録画（必須・ファイル名は任意）

スクリーンショット:
  - `step-01-xxx.png` - [説明]
  - `step-02-xxx.png` - [説明]
  - ...

### 実行結果
- 成功したシナリオ: X件
- 失敗したシナリオ: Y件
- 備考: [任意のメモ]
```

## エラー時の対応

### アプリケーション未起動

```
エラー: アプリケーションに接続できません
URL: {{APP_URL}}

推奨アクション:
1. アプリケーションが起動しているか確認してください
2. 正しいURLか確認してください
3. ファイアウォール設定を確認してください
```

### 要素が見つからない

```
警告: 要素が見つかりません
セレクタ: [selector]

対応:
- 現在の画面状態をスクリーンショットで記録
- 次のシナリオに進む
- 最終報告でこの問題を記載
```

## 注意事項

1. **非破壊的操作**: データ削除などの破壊的操作は実行しない
2. **タイムアウト**: 各操作は10秒でタイムアウト
3. **リトライ**: 失敗した操作は最大2回リトライ
4. **スクリーンショット優先**: 操作が失敗しても、可能な限りスクリーンショットを取得
```

---

## 変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `{{SECTION_NAME}}` | セクション表示名 | Section 2: User Dashboard [E2E] |
| `{{SECTION_ID}}` | セクションID | section-2-user-dashboard |
| `{{FEATURE_NAME}}` | フィーチャー名 | user-dashboard |
| `{{APP_URL}}` | アプリケーションURL | http://localhost:3000/dashboard |
| `{{E2E_SCENARIOS}}` | E2Eシナリオ一覧 | (下記参照) |
| `{{EVIDENCE_DIR}}` | エビデンス保存先 | .context/e2e-evidence/user-dashboard/section-2-user-dashboard/ |

---

## E2Eシナリオの展開例

### 入力

```markdown
### Task 2.1: Build login form
**E2E:** ログインフォーム表示、入力フィールド確認、送信ボタン動作

### Task 2.2: Add validation
**E2E:** 空入力エラー表示、不正形式エラー表示
```

### 展開後

```
## E2Eシナリオ

### Task 2.1: Build login form
1. ログインフォーム表示
   - ページを開く
   - フォームが表示されることを確認
   - スクリーンショット: step-01-login-form-display.png

2. 入力フィールド確認
   - メールアドレス入力欄が存在することを確認
   - パスワード入力欄が存在することを確認
   - スクリーンショット: step-02-input-fields.png

3. 送信ボタン動作
   - 送信ボタンをクリック
   - ボタンの反応を確認
   - スクリーンショット: step-03-submit-button.png

### Task 2.2: Add validation
1. 空入力エラー表示
   - 入力欄を空のまま送信
   - エラーメッセージが表示されることを確認
   - スクリーンショット: step-04-empty-error.png

2. 不正形式エラー表示
   - 不正なメールアドレスを入力
   - フォーマットエラーが表示されることを確認
   - スクリーンショット: step-05-format-error.png
```

---

## Playwrightアクション対応表

| シナリオアクション | Playwright |
|------------------|----------------|
| ブラウザ起動（録画付き） | `browser.newContext({ recordVideo: {...} })` |
| ページを開く | `page.goto(url)` |
| 要素をクリック | `page.click(selector)` |
| テキスト入力 | `page.fill(selector, text)` |
| スクリーンショット | `page.screenshot({ path: '...' })` |
| 要素の確認 | `page.locator(selector)` |
| 待機 | `page.waitForSelector(selector)` |
| 録画保存 | `context.close()` |

---

## 汎用シナリオ（E2E未定義時）

`**E2E:**` が定義されていないセクションのフォールバック:

```
## 汎用E2Eシナリオ

このセクションには具体的なE2Eシナリオが定義されていません。
以下の汎用シナリオを実行します。

### 1. 初期表示確認
- ページを開く
- 主要なコンポーネントが表示されることを確認
- スクリーンショット: step-01-initial.png

### 2. 基本インタラクション
- クリック可能な要素を探す
- 最初のインタラクティブ要素をクリック
- 画面の変化を記録
- スクリーンショット: step-02-interaction.png

### 3. 最終状態
- 現在の画面状態を記録
- スクリーンショット: step-03-final.png
```

---

## 実行例

### 1. シナリオ実行開始

```
E2Eエビデンス収集を開始します。

セクション: Section 2: User Dashboard [E2E]
URL: http://localhost:3000/dashboard
シナリオ数: 3

ブラウザを起動しています...
```

### 2. シナリオ実行中

```
[1/3] ダッシュボード初期表示
  ✓ ページ遷移完了
  ✓ スクリーンショット: step-01-dashboard-initial.png

[2/3] ウィジェット表示確認
  ✓ ウィジェットコンテナ発見
  ✓ スクリーンショット: step-02-widgets.png

[3/3] データ更新動作
  ✓ 更新ボタンクリック
  ✓ ローディング表示確認
  ✓ スクリーンショット: step-03-refresh.png
```

### 3. 完了報告

```
## E2Eエビデンス収集完了

### 結果サマリー
- セクション: Section 2: User Dashboard [E2E]
- 実行日時: 2025-12-30T12:00:00Z
- ステータス: 成功

### 収集ファイル
保存先: `.context/e2e-evidence/user-dashboard/section-2-user-dashboard/`

| ファイル | 説明 |
|---------|------|
| *.webm | 画面録画（必須・ファイル名は任意） |
| step-01-dashboard-initial.png | ダッシュボード初期表示 |
| step-02-widgets.png | ウィジェット表示確認 |
| step-03-refresh.png | データ更新後の状態 |

### 次のステップ
Codexレビューに進みます。
```
