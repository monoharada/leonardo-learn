# セクション検出アルゴリズム

本ドキュメントでは、tasks.mdからセクションを検出し、セクション単位でレビューを実行するための仕様を定義します。

---

## tasks.md セクションフォーマット

### 推奨構造

```markdown
## Section 1: Core Foundation

### Task 1.1: Define base types
**Creates:** `src/types/base.ts`
**Implements:** REQ-1.1

[タスク詳細...]

### Task 1.2: Implement utilities
**Creates:** `src/utils/helpers.ts`, `src/utils/helpers.test.ts`
**Modifies:** `src/config/index.ts`
**Implements:** REQ-1.2

[タスク詳細...]

## Section 2: Feature Implementation [E2E]

### Task 2.1: Build main component
**Creates:** `src/components/Main.tsx`, `src/components/Main.test.tsx`
**Implements:** REQ-2.1, REQ-2.2
**E2E:** コンポーネントの初期表示確認、ユーザー操作テスト

[タスク詳細...]

### Task 2.2: Add user interaction
**Creates:** `src/components/UserForm.tsx`
**Implements:** REQ-2.3
**E2E:** フォーム入力、バリデーション表示、送信確認

[タスク詳細...]
```

### フォーマット要素

| 要素 | パターン | 説明 |
|------|---------|------|
| セクション見出し | `## Section X: Name` | セクション境界を定義 |
| E2Eセクション | `## Section X: Name [E2E]` | E2Eエビデンス収集が必要なセクション |
| タスク見出し | `### Task X.Y: Title` | セクション内のタスク |
| 作成ファイル | `**Creates:** \`path\`` | タスクが作成するファイル |
| 変更ファイル | `**Modifies:** \`path\`` | タスクが変更するファイル |
| 要件トレース | `**Implements:** REQ-X.X` | 対応する要件ID |
| E2Eシナリオ | `**E2E:** シナリオ説明` | そのタスクのE2E検証シナリオ |

---

## セクション解析アルゴリズム

### Step 1: セクション境界の検出

```
INPUT: tasks.md content
OUTPUT: sections[]

1. 行ごとにスキャン
2. `^## ` で始まる行をセクション境界として検出
3. 各セクションの範囲（開始行〜次のセクション or EOF）を記録
```

### Step 2: タスクの抽出

```
FOR each section:
    1. セクション範囲内で `^### Task ` パターンを検索
    2. タスクID（X.Y形式）を抽出
    3. タスクをセクションにマッピング
```

### Step 3: 期待ファイルの抽出

```
FOR each task:
    1. `**Creates:** ` の後のファイルパスを抽出
    2. `**Modifies:** ` の後のファイルパスを抽出
    3. バッククォート内のパス、カンマ区切り複数パス対応

    正規表現例:
    Creates: /\*\*Creates:\*\*\s*(.+)$/
    ファイル抽出: /`([^`]+)`/g
```

### Step 4: E2Eタグの検出

```
FOR each section:
    1. セクション見出しに `[E2E]` サフィックスがあるか確認
    2. 正規表現: /\[E2E\]\s*$/
    3. マッチした場合: section.e2e_required = true
    4. セクション内の各タスクから `**E2E:**` を抽出

E2E検出の正規表現:
    セクションタグ: /^##\s+.+\s*\[E2E\]\s*$/
    タスクシナリオ: /\*\*E2E:\*\*\s*(.+)$/

E2Eシナリオの集約:
    section.e2e_scenarios = [
        { task: "2.1", scenario: "コンポーネントの初期表示確認、ユーザー操作テスト" },
        { task: "2.2", scenario: "フォーム入力、バリデーション表示、送信確認" }
    ]
```

---

## セクションIDの生成

セクション見出しからセクションIDを自動生成：

```
入力: "## Section 1: Core Foundation"
出力: "section-1-core-foundation"

変換ルール:
1. "## " プレフィックスを除去
2. 小文字に変換
3. 英数字以外をハイフンに置換
4. 連続ハイフンを単一に圧縮
5. 先頭・末尾のハイフンを除去
```

---

## 完了判定アルゴリズム

### 推奨: タスク完了フラグ方式

**重要**: 同一ファイルを複数セクションで `**Modifies:**` 指定する場合、git diff方式では誤判定が発生します。
タスク完了フラグを使用することで、セクション単位の正確な完了判定が可能になります。

```
FUNCTION isSectionComplete(sectionId):
    section = getSectionById(sectionId)

    // 方式1: タスク完了フラグ（推奨）
    IF section.tasks_completed EXISTS:
        FOR each taskId in section.tasks:
            IF NOT section.tasks_completed[taskId]:
                RETURN false
        RETURN true

    // 方式2: ファイル存在チェック（フォールバック）
    RETURN isSectionCompleteByFiles(sectionId)

FUNCTION isSectionCompleteByFiles(sectionId):
    section = getSectionById(sectionId)

    // 1. Creates ファイル: 存在確認
    FOR each file in section.creates_files:
        IF NOT fileExists(file):
            RETURN false

    // 2. Modifies ファイル: 変更検出（コミット済み + 未コミット）
    FOR each file in section.modifies_files:
        IF NOT fileExists(file):
            RETURN false
        IF NOT hasFileChanges(file):
            RETURN false

    RETURN true

FUNCTION hasFileChanges(file, baseBranch = "main"):
    // コミット済み変更 OR 未コミット変更 を検出
    // git diff main..HEAD: mainブランチからHEADまでのコミット済み差分
    // git diff HEAD: HEADから作業ツリーまでの未コミット差分（staged + unstaged）
    committed = exec("git diff " + baseBranch + "..HEAD -- " + file)
    uncommitted = exec("git diff HEAD -- " + file)
    RETURN committed.length > 0 OR uncommitted.length > 0
```

### git diff コマンドの意味

| コマンド | 検出対象 | 説明 |
|----------|----------|------|
| `git diff main..HEAD -- file` | コミット済み | mainブランチからHEADまでの差分 |
| `git diff HEAD -- file` | 未コミット全体 | staged + unstaged の変更 |
| `git diff --staged -- file` | staged のみ | `git add` 済みの変更のみ |
| `git diff -- file` | unstaged のみ | `git add` 前の変更のみ |

本実装では `git diff HEAD` を使用して、staged/unstaged 両方の未コミット変更を検出します。

### タスク完了フラグのスキーマ

```json
{
  "section_tracking": {
    "sections": {
      "section-1-core-foundation": {
        "tasks_completed": {
          "1.1": true,
          "1.2": true
        }
      },
      "section-2-feature-impl": {
        "tasks_completed": {
          "2.1": true,
          "2.2": false
        }
      }
    }
  }
}
```

### タスク完了フラグの更新タイミング

実装コマンド（`/kiro:spec-impl`）がタスク完了時にフラグを更新：

```javascript
// タスク実装完了時
spec.section_tracking.sections[sectionId].tasks_completed[taskId] = true;
spec.updated_at = new Date().toISOString();
```

### 重要: Creates vs Modifies の区別

| タイプ | 完了条件（フラグ方式） | 完了条件（ファイル方式） |
|--------|----------------------|------------------------|
| `**Creates:**` | タスク完了フラグ = true | ファイル存在 |
| `**Modifies:**` | タスク完了フラグ = true | ファイル存在 + 変更あり |

### なぜタスク完了フラグが推奨か

1. **セクション単位の正確な判定**: 同一ファイルが複数セクションで変更されても、各セクションの完了を正確に追跡
2. **未コミット変更の対応**: git diff に依存しないため、コミット前でも完了判定可能
3. **明示的な完了宣言**: 実装者が意図的に「完了」をマークするため、誤判定リスクが低い

### フォールバック: ファイル方式の注意点

タスク完了フラグがない場合のファイル方式には以下の制限があります：

| 制限 | 説明 |
|------|------|
| 同一ファイル複数セクション | 前セクションの変更が後セクションの完了を誤判定させる |
| 未コミット変更 | `git diff HEAD --` で検出するが、コミット済みとの併用が必要 |

**推奨**: 新規プロジェクトではタスク完了フラグ方式を使用してください。

### shouldTriggerReview(sectionId)

```
FUNCTION shouldTriggerReview(sectionId):
    // セクションが完了していること
    IF NOT isSectionComplete(sectionId):
        RETURN false

    // まだレビューされていないこと
    IF sectionAlreadyReviewed(sectionId):
        RETURN false

    RETURN true
```

---

## 状態管理

### 正本（Source of Truth）: spec.json

**重要**: セクション状態の正本は `spec.json` の `section_tracking` フィールドです。

| ファイル | 役割 | 更新タイミング |
|----------|------|---------------|
| `spec.json.section_tracking` | **正本** - レビュー状態、完了状態 | レビュー完了時、E2E完了時 |
| `.context/section-completion-state.json` | **キャッシュ** - tasks.md解析結果 | tasks.md変更検知時に再生成 |

### キャッシュファイル

`.context/section-completion-state.json` は tasks.md の解析結果をキャッシュするためのもので、
`spec.json` と矛盾する場合は **spec.json が優先** されます。

キャッシュ内容（tasks.md 解析結果のみ）：

```json
{
  "feature": "my-feature",
  "parsed_at": "2025-12-30T10:00:00Z",
  "tasks_md_hash": "abc123...",
  "sections": {
    "section-1-core-foundation": {
      "name": "Section 1: Core Foundation",
      "line_range": [1, 25],
      "tasks": ["1.1", "1.2"],
      "tasks_completed": {
        "1.1": true,
        "1.2": true
      },
      "creates_files": [
        "src/types/base.ts",
        "src/utils/helpers.ts"
      ],
      "modifies_files": [
        "src/config/index.ts"
      ],
      "e2e_required": false,
      "e2e_scenarios": [],
      "status": "complete",
      "completed_at": "2025-12-30T12:00:00Z",
      "reviewed": true,
      "review_session_id": "codex-xyz"
    },
    "section-2-feature-impl": {
      "name": "Section 2: Feature Implementation [E2E]",
      "line_range": [26, 50],
      "tasks": ["2.1", "2.2"],
      "tasks_completed": {
        "2.1": true,
        "2.2": false
      },
      "creates_files": [
        "src/components/Main.tsx",
        "src/components/Main.test.tsx",
        "src/components/UserForm.tsx"
      ],
      "modifies_files": [],
      "e2e_required": true,
      "e2e_scenarios": [
        { "task": "2.1", "scenario": "コンポーネントの初期表示確認、ユーザー操作テスト" },
        { "task": "2.2", "scenario": "フォーム入力、バリデーション表示、送信確認" }
      ],
      "e2e_evidence": {
        "status": "pending",
        "video_path": null,
        "screenshots": [],
        "executed_at": null,
        "error_message": null
      },
      "status": "in_progress",
      "completed_at": null,
      "reviewed": false,
      "review_session_id": null
    }
  }
}
```

---

## 変更検知

### tasks.mdの変更検知

```
現在のハッシュ = SHA-256(tasks.md内容)
保存済みハッシュ = state.tasks_md_hash

IF 現在のハッシュ != 保存済みハッシュ:
    // tasks.mdが変更された
    1. セクション構造を再解析
    2. 既存のレビュー状態を可能な限り維持
    3. 新しいセクションは未レビュー状態で追加
    4. 削除されたセクションは状態から除去
```

---

## エッジケース

### セクションがない場合

tasks.mdに `##` 見出しがない場合：

```
1. 全体を単一セクション "default" として扱う
2. 全タスク完了時にレビュー実行
```

### ファイルパス指定がない場合

タスクに `**Creates:**` / `**Modifies:**` がない場合：

```
1. 警告ログを出力
2. そのタスクは常に「完了」として扱う
3. セクション内の他タスクの完了で判定
```

### 複数ファイルの記述

カンマ区切りで複数ファイルを指定可能：

```markdown
**Creates:** `src/a.ts`, `src/b.ts`, `src/c.ts`
```

### E2Eタグがあるがシナリオがない場合

セクションに `[E2E]` タグがあるが、タスクに `**E2E:**` がない場合：

```
1. 警告ログを出力
2. e2e_required = true のまま維持
3. e2e_scenarios = [] (空配列)
4. E2Eエビデンス収集時に汎用シナリオを使用
```

### E2Eエビデンス収集失敗時

Playwright（`recordVideo`オプション有効）での実行が失敗した場合：

```
1. e2e_evidence.status = "failed"
2. e2e_evidence.error_message にエラー内容を記録
3. 警告をユーザーに通知
4. Codexレビューは続行（E2E失敗でブロックしない）
```

---

## E2Eエビデンスワークフロー

### トリガー条件

```
FUNCTION shouldTriggerE2EEvidence(sectionId):
    section = getSectionById(sectionId)

    // Codexレビューで承認されていること（最重要）
    IF NOT sectionReviewApproved(sectionId):
        RETURN false

    // E2Eが必要なセクションであること
    IF NOT section.e2e_required:
        RETURN false

    // まだE2Eエビデンスが収集されていないこと
    IF section.e2e_evidence.status != "pending":
        RETURN false

    RETURN true
```

### 実行フロー（レビュー後にE2E）

```
セクション完了
    ↓
Codexレビュー実行
    ↓
APPROVED ?
    ├── NO → 修正 → 再レビュー
    ↓ YES
shouldTriggerE2EEvidence(sectionId) = true?
    ├── NO → セクション完了、次へ進行
    ↓ YES
E2Eエビデンス収集（Playwright + recordVideo）
    ↓
結果を e2e_evidence に保存
    ↓
エビデンスディレクトリを自動オープン
    ↓
セクション完了、次へ進行
```

### なぜレビュー後にE2Eを実行するのか

1. **品質優先**: レビュー済みの承認されたコードでエビデンスを取得
2. **効率性**: レビューで修正が入る可能性があるため、レビュー前のE2Eは無駄
3. **エビデンス目的**: 最終的な品質保証済みコードの動作を記録

### エビデンス保存先

```
.context/e2e-evidence/
└── [feature-name]/
    └── [section-id]/
        ├── *.webm                   # 画面録画（必須・ファイル名は任意）
        ├── step-01-initial.png     # 初期状態
        ├── step-02-action.png      # 操作後
        └── step-03-complete.png    # 完了状態
```

**注意**: Playwrightの`recordVideo`オプションを使用して、必ず録画を取得すること。スクリーンショットは補助エビデンスとして併用します。

---

## 実装例

### Codex実行時のセクションコンテキスト

```bash
codex exec --sandbox read-only "
## セクション実装レビュー

### レビュー対象
セクション: {{SECTION_NAME}}
タスク: {{SECTION_TASK_IDS}}

### 変更ファイル
$(for file in {{SECTION_FILES}}; do echo "- $file"; done)

### セクション境界
- このセクションで完了すべき: {{IN_SCOPE_FEATURES}}
- 後続セクションで対応: {{OUT_OF_SCOPE_FEATURES}}

[プロンプト本文...]
"
```
