# spec.json フォーマット仕様

レビュー結果とフェーズ進行状況を記録するspec.jsonの仕様です。

---

## 基本構造

```json
{
  "phase": "requirements-approved",
  "approvals": {
    "requirements": { "approved": true },
    "design": { "approved": false },
    "tasks": { "approved": false }
  },
  "updated_at": "2025-12-25T12:00:00.000Z",
  "interview": {
    "requirements": false
  },
  "codex_reviews": {
    "requirements": {
      "review_count": 2,
      "final_verdict": "OK",
      "resolved_issues": 3,
      "session_id": "codex-session-xyz",
      "timestamp": "2025-12-25T12:00:00.000Z"
    }
  }
}
```

---

## フィールド説明

### phase

現在のフェーズを示す文字列。

| 値 | 意味 |
|----|------|
| `initialized` | 初期状態 |
| `requirements-approved` | 要件レビュー承認済み |
| `design-approved` | 設計レビュー承認済み |
| `ready-for-implementation` | タスクレビュー承認済み、実装可能 |
| `impl-approved` | 実装レビュー承認済み |
| `completed` | 全フェーズ完了 |

### approvals

各フェーズの承認状況。

```json
{
  "requirements": { "approved": boolean, "generated": boolean },
  "design": { "approved": boolean },
  "tasks": { "approved": boolean }
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `requirements.generated` | boolean | 要件が生成済みか（`/kiro:spec-requirements`完了時にtrue） |
| `requirements.approved` | boolean | 要件がレビュー承認されたか |
| `design.approved` | boolean | 設計がレビュー承認されたか |
| `tasks.approved` | boolean | タスクがレビュー承認されたか |

### codex_reviews

Codexレビューの履歴。

```json
{
  "[phase]": {
    "review_count": number,        // レビュー回数
    "final_verdict": string,       // 最終判定（OK, GO, APPROVED等）
    "resolved_issues": number,     // 解決した指摘件数
    "session_id": string,          // Codex Session ID（必須）
    "timestamp": string            // ISO8601形式タイムスタンプ
  }
}
```

### interview（オプション）

プリフライトインタビューの設定。各フェーズでインタビューを強制実行するかを制御します。

```json
{
  "interview": {
    "requirements": boolean,  // true: 要件生成時にインタビューを強制実行
    "design": boolean,        // true: 設計生成時にインタビューを強制実行（将来用）
    "tasks": boolean          // true: タスク生成時にインタビューを強制実行（将来用）
  }
}
```

**使用例**: 既に `requirements-approved` 状態でも、明示的にインタビューを再実行したい場合に `interview.requirements: true` を設定。

---

## フェーズ別更新例

### 要件レビュー承認時

```javascript
spec.approvals.requirements.approved = true;
spec.phase = "requirements-approved";
spec.updated_at = new Date().toISOString();
spec.codex_reviews.requirements = {
  review_count: 2,
  final_verdict: "OK",
  resolved_issues: 3,
  session_id: "abc123",
  timestamp: new Date().toISOString()
};
```

### 設計レビュー承認時

```javascript
spec.approvals.design.approved = true;
spec.phase = "design-approved";
```

### タスクレビュー承認時

```javascript
spec.approvals.tasks.approved = true;
spec.phase = "ready-for-implementation";
```

---

## 判定値マッピング

| フェーズ | PASS | FAIL |
|---------|------|------|
| requirements | OK | NEEDS_REVISION |
| design | GO | NO_GO |
| tasks | APPROVED | NEEDS_REVISION |
| impl | APPROVED | NEEDS_REVISION |

---

## セクション追跡（section_tracking）

### 概要

実装フェーズでセクション単位のレビューを行うための追跡情報。
tasks.mdの`##`見出しで定義されたセクション単位で進捗を管理します。

### 構造

```json
{
  "section_tracking": {
    "enabled": true,
    "total_sections": 3,
    "completed_sections": 1,
    "reviewed_sections": 1,
    "current_section": "section-2-feature-impl",
    "sections": {
      "section-1-core-foundation": {
        "name": "Section 1: Core Foundation",
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
        "status": "complete",
        "reviewed": true,
        "review_session_id": "codex-section1-001"
      },
      "section-2-feature-impl": {
        "name": "Section 2: Feature Implementation",
        "tasks": ["2.1", "2.2"],
        "tasks_completed": {
          "2.1": true,
          "2.2": false
        },
        "creates_files": [
          "src/components/Main.tsx",
          "src/components/Main.test.tsx"
        ],
        "modifies_files": [],
        "status": "in_progress",
        "reviewed": false,
        "review_session_id": null
      }
    }
  }
}
```

### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `enabled` | boolean | セクション追跡が有効か（デフォルト: true） |
| `total_sections` | number | 全セクション数 |
| `completed_sections` | number | 完了済みセクション数 |
| `reviewed_sections` | number | レビュー済みセクション数 |
| `current_section` | string | 現在作業中のセクションID |
| `sections` | object | セクション別詳細情報 |

### セクション別フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `name` | string | セクション表示名 |
| `tasks` | string[] | セクション内のタスクID配列 |
| `tasks_completed` | object | タスク完了フラグ（**推奨**）: `{"1.1": true, "1.2": false}` |
| `creates_files` | string[] | `**Creates:**` で指定されたファイル（存在確認のみ） |
| `modifies_files` | string[] | `**Modifies:**` で指定されたファイル |
| `status` | string | `"pending"` / `"in_progress"` / `"complete"` |
| `reviewed` | boolean | Codexレビュー済みか |
| `review_session_id` | string / null | Codex Session ID |
| `e2e_required` | boolean | E2Eエビデンス収集が必要か（`[E2E]`タグ検出時 true） |
| `e2e_scenarios` | array | E2Eシナリオ一覧（`**E2E:**`から抽出） |
| `e2e_evidence` | object / null | E2Eエビデンス収集結果 |

### 後方互換性

#### 基本ルール

- `section_tracking`フィールドが存在しない場合: 従来動作（タスクごとのレビュー）
- tasks.mdに`##`見出しがない場合: 全体を単一セクションとして扱う
- `e2e_required`フィールドが存在しない場合: E2Eエビデンス収集はスキップ

#### expected_files から creates_files/modifies_files への移行

旧スキーマ（`expected_files`）から新スキーマへの移行ルール：

| 状況 | 処理 |
|------|------|
| `expected_files` のみ存在 | `creates_files = expected_files`, `modifies_files = []` として扱う |
| `creates_files`/`modifies_files` 存在 | 新スキーマを優先（`expected_files` は無視） |
| 両方存在 | 新スキーマ（`creates_files`/`modifies_files`）を使用 |

```javascript
// 読み取り時の変換ロジック
function normalizeSection(section) {
  if (section.creates_files === undefined && section.expected_files) {
    // 旧スキーマ → 新スキーマ変換
    section.creates_files = section.expected_files;
    section.modifies_files = [];
  }
  return section;
}
```

#### tasks_completed フラグの後方互換性

- `tasks_completed` が存在しない場合: ファイル存在チェック方式にフォールバック
- `tasks_completed` が存在する場合: フラグ方式を優先（より正確な判定）

---

## E2Eエビデンス（e2e_evidence）

### 概要

`[E2E]` タグ付きセクションでは、Playwright（`recordVideo`オプション有効）を使用してE2Eテストのエビデンス（画面録画・スクリーンショット）を収集します。

### e2e_scenarios 構造

```json
{
  "e2e_scenarios": [
    {
      "task": "2.1",
      "scenario": "ログインフォーム表示、入力フィールド確認"
    },
    {
      "task": "2.2",
      "scenario": "バリデーションエラー表示、送信成功"
    }
  ]
}
```

### e2e_evidence 構造

```json
{
  "e2e_evidence": {
    "status": "passed",
    "video_path": ".context/e2e-evidence/my-feature/section-2-ui/recording.webm",
    "screenshots": [
      ".context/e2e-evidence/my-feature/section-2-ui/step-01-initial.png",
      ".context/e2e-evidence/my-feature/section-2-ui/step-02-action.png",
      ".context/e2e-evidence/my-feature/section-2-ui/step-03-complete.png"
    ],
    "executed_at": "2025-12-30T12:00:00.000Z",
    "error_message": null
  }
}
```

### e2e_evidence フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `status` | string | `"pending"` / `"passed"` / `"failed"` |
| `video_path` | string / null | 録画ファイルパス（**必須**: 失敗時のみnull許容） |
| `screenshots` | string[] | スクリーンショットファイルパス配列（推奨） |
| `executed_at` | string / null | 実行日時（ISO8601形式） |
| `error_message` | string / null | エラー発生時のメッセージ |

**重要**: Playwrightの`recordVideo`オプションを使用して、必ず画面録画を取得すること。
録画なしのエビデンスは不完全とみなします。`video_path`は成功時は必須、失敗時のみnull許容。

### E2E失敗時の例

```json
{
  "e2e_evidence": {
    "status": "failed",
    "video_path": null,
    "screenshots": [],
    "executed_at": "2025-12-30T12:00:00.000Z",
    "error_message": "Playwright接続失敗: Connection refused"
  }
}
```

### 重要: E2E失敗はブロッキングではない

E2Eエビデンス収集が失敗しても、Codexレビューは続行します。
E2Eはエビデンス目的であり、品質ゲートではありません。

---

## セクション単位のimplレビュー

### codex_reviews.impl 拡張構造

セクション単位でレビューする場合、`impl`フィールドを拡張：

```json
{
  "codex_reviews": {
    "impl": {
      "mode": "section",
      "sections": {
        "section-1-core-foundation": {
          "review_count": 1,
          "final_verdict": "APPROVED",
          "resolved_issues": 2,
          "session_id": "codex-impl-section1-001",
          "timestamp": "2025-12-30T12:00:00.000Z"
        },
        "section-2-feature-impl": {
          "review_count": 0,
          "final_verdict": null,
          "session_id": null,
          "timestamp": null
        }
      },
      "all_sections_approved": false,
      "final_verdict": null,
      "timestamp": null
    }
  }
}
```

### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `mode` | string | `"section"` / `"full"`（デフォルト: "full"） |
| `sections` | object | セクション別レビュー結果 |
| `all_sections_approved` | boolean | 全セクションがAPPROVEDか |
| `final_verdict` | string / null | 全体の最終判定 |

---

## 完全な例（セクション追跡あり）

```json
{
  "name": "user-authentication",
  "phase": "ready-for-implementation",
  "approvals": {
    "requirements": { "approved": true },
    "design": { "approved": true },
    "tasks": { "approved": true }
  },
  "updated_at": "2025-12-30T15:30:00.000Z",
  "section_tracking": {
    "enabled": true,
    "total_sections": 2,
    "completed_sections": 1,
    "reviewed_sections": 1,
    "current_section": "section-2-feature-impl",
    "sections": {
      "section-1-core-foundation": {
        "name": "Section 1: Core Foundation",
        "tasks": ["1.1", "1.2"],
        "tasks_completed": {
          "1.1": true,
          "1.2": true
        },
        "creates_files": [
          "src/types/base.ts",
          "src/utils/helpers.ts"
        ],
        "modifies_files": [],
        "e2e_required": false,
        "e2e_scenarios": [],
        "e2e_evidence": null,
        "status": "complete",
        "reviewed": true,
        "review_session_id": "codex-section1-001"
      },
      "section-2-feature-impl": {
        "name": "Section 2: Feature Implementation [E2E]",
        "tasks": ["2.1", "2.2"],
        "tasks_completed": {
          "2.1": true,
          "2.2": false
        },
        "creates_files": [
          "src/components/Main.tsx",
          "src/components/Main.test.tsx"
        ],
        "modifies_files": [],
        "e2e_required": true,
        "e2e_scenarios": [
          { "task": "2.1", "scenario": "コンポーネント初期表示、ユーザー操作確認" },
          { "task": "2.2", "scenario": "フォーム入力、バリデーション表示" }
        ],
        "e2e_evidence": {
          "status": "pending",
          "video_path": null,
          "screenshots": [],
          "executed_at": null,
          "error_message": null
        },
        "status": "in_progress",
        "reviewed": false,
        "review_session_id": null
      }
    }
  },
  "codex_reviews": {
    "requirements": {
      "review_count": 1,
      "final_verdict": "OK",
      "resolved_issues": 0,
      "session_id": "codex-req-001",
      "timestamp": "2025-12-25T10:00:00.000Z"
    },
    "design": {
      "review_count": 2,
      "final_verdict": "GO",
      "resolved_issues": 2,
      "session_id": "codex-design-002",
      "timestamp": "2025-12-25T12:00:00.000Z"
    },
    "tasks": {
      "review_count": 1,
      "final_verdict": "APPROVED",
      "resolved_issues": 0,
      "session_id": "codex-tasks-003",
      "timestamp": "2025-12-25T14:00:00.000Z"
    },
    "impl": {
      "mode": "section",
      "sections": {
        "section-1-core-foundation": {
          "review_count": 1,
          "final_verdict": "APPROVED",
          "resolved_issues": 2,
          "session_id": "codex-impl-section1-001",
          "timestamp": "2025-12-30T12:00:00.000Z"
        },
        "section-2-feature-impl": {
          "review_count": 0,
          "final_verdict": null,
          "session_id": null,
          "timestamp": null
        }
      },
      "all_sections_approved": false,
      "final_verdict": null,
      "timestamp": null
    }
  }
}
```

---

## 完全な例（従来方式・後方互換）

```json
{
  "name": "user-authentication",
  "phase": "impl-approved",
  "approvals": {
    "requirements": { "approved": true },
    "design": { "approved": true },
    "tasks": { "approved": true }
  },
  "updated_at": "2025-12-25T15:30:00.000Z",
  "interview": {
    "requirements": false,
    "design": false,
    "tasks": false
  },
  "codex_reviews": {
    "requirements": {
      "review_count": 1,
      "final_verdict": "OK",
      "resolved_issues": 0,
      "session_id": "codex-req-001",
      "timestamp": "2025-12-25T10:00:00.000Z"
    },
    "design": {
      "review_count": 2,
      "final_verdict": "GO",
      "resolved_issues": 2,
      "session_id": "codex-design-002",
      "timestamp": "2025-12-25T12:00:00.000Z"
    },
    "tasks": {
      "review_count": 1,
      "final_verdict": "APPROVED",
      "resolved_issues": 0,
      "session_id": "codex-tasks-003",
      "timestamp": "2025-12-25T14:00:00.000Z"
    },
    "impl": {
      "review_count": 3,
      "final_verdict": "APPROVED",
      "resolved_issues": 5,
      "session_id": "codex-impl-004",
      "timestamp": "2025-12-25T15:30:00.000Z"
    }
  }
}
```
