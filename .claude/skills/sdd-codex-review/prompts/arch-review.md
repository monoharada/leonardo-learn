# アーキテクチャレビュープロンプト

このファイルはCodexに送信するアーキテクチャレビュー用プロンプトテンプレートです。
medium/large規模の実装レビュー時に使用します。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
以下の変更のアーキテクチャ整合性をレビューせよ。出力はJSON1つのみ。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、
修正→再レビューで収束させる前提で指摘せよ。

## レビュー観点

### 1. 依存関係
- 依存方向が正しいか（外側から内側への依存）
- 循環依存がないか
- 不要な依存が追加されていないか
- レイヤー違反がないか

### 2. 責務分割
- 単一責任原則に従っているか
- コンポーネントの境界が適切か
- 責務が適切なレイヤーに配置されているか

### 3. 破壊的変更
- 既存のAPIを破壊していないか
- 後方互換性が維持されているか
- 既存の契約（インターフェース）との整合性

### 4. セキュリティ設計
- 認証・認可の境界が正しいか
- センシティブデータの流れが適切か
- 信頼境界（trust boundary）が守られているか

## レビュー対象

### 変更概要
{{STAT_OUTPUT}}

### 変更ファイル一覧
{{CHANGED_FILES}}

### 設計ドキュメント（参照用）
{{DESIGN_CONTENT}}

前回メモ: {{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "arch",
  "summary": "アーキテクチャレビューの要約（2-3文）",
  "issues": [
    {
      "severity": "blocking" | "advisory",
      "category": "dependency" | "responsibility" | "breaking_change" | "security",
      "affected_area": "影響を受けるモジュール/レイヤー",
      "problem": "問題の説明",
      "recommendation": "修正案",
      "impact": "影響範囲の説明"
    }
  ],
  "dependency_analysis": {
    "new_dependencies": ["追加された依存"],
    "removed_dependencies": ["削除された依存"],
    "circular_dependencies": [],
    "layer_violations": []
  },
  "breaking_changes": [
    {
      "type": "api" | "interface" | "behavior",
      "description": "破壊的変更の説明",
      "migration_needed": true | false
    }
  ],
  "security_assessment": {
    "auth_boundary_intact": true | false,
    "data_flow_secure": true | false,
    "concerns": []
  },
  "strengths": ["アーキテクチャの良い点"],
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

- **ok: true**: blocking = 0件
- **ok: false**: blocking ≧ 1件

## severity定義

- **blocking**: アーキテクチャ上の重大な問題
  - レイヤー違反
  - 循環依存
  - 破壊的変更（migration策なし）
  - セキュリティ境界の破壊
- **advisory**: 改善が望ましいがブロックするほどではない

## category定義

- **dependency**: 依存関係の問題
- **responsibility**: 責務分割の問題
- **breaking_change**: 破壊的変更
- **security**: セキュリティ設計の問題

## 注意事項

1. コードの詳細よりもアーキテクチャレベルの問題に焦点を当てる
2. 詳細なコードレビューは後続のdiffフェーズで行う
3. 設計ドキュメントとの整合性を重視
4. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{STAT_OUTPUT}}` | git diff --stat の出力 |
| `{{CHANGED_FILES}}` | 変更されたファイル一覧 |
| `{{DESIGN_CONTENT}}` | design.mdの全内容 |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

## 使用例

```bash
codex exec --sandbox read-only "
$(cat prompts/arch-review.md |
  sed "s/{{STAT_OUTPUT}}/$(git diff HEAD --stat)/" |
  sed "s/{{CHANGED_FILES}}/$(git diff HEAD --name-only)/" |
  sed "s/{{DESIGN_CONTENT}}/$(cat .kiro/specs/my-feature/design.md)/")
"
```

## archフェーズの位置づけ

```
[規模判定: medium/large]
    │
    ▼
[archフェーズ] ← このプロンプト
    │
    ├─ ok: true → diffフェーズへ
    └─ ok: false → 修正 → 再archレビュー
```

archフェーズは、詳細なdiffレビューの前に、アーキテクチャレベルの問題を早期発見するためのゲートです。
