# パレットビュー: Secondary/Tertiary のトークン行を追加

## Context
- 現状 `src/ui/demo/views/palette-view.ts` の `extractPaletteTokenRows()` が Primary/Accent のみ行生成
- `state.palettes` には Secondary/Tertiary が入り得る（生成経路により常に/一部のみ）

## Scope
- やること: パレットビューのトークン一覧に **Secondary/Tertiary を追加表示**
- やらないこと: プレビューUIの役割追加、テーブルUIのデザイン変更、カテゴリ体系の拡張

## Proposed change
- `src/ui/demo/views/palette-view.ts` の `extractPaletteTokenRows()` に Secondary/Tertiary の分岐を追加
- `step` は `parseKeyColor()` の結果だけでなく `palette.step` も参照する

## Implementation details
- 判定（例）
  - `isSecondary = palette.derivedFrom?.derivationType === "secondary" || palette.name === "Secondary"`
  - `isTertiary  = palette.derivedFrom?.derivationType === "tertiary"  || palette.name === "Tertiary"`
- 行追加
  - `tokenName`: `"セカンダリ"`, `"ターシャリ"`
  - `primitiveName`: `${chromaName}-${step}`
  - `category`: `"primary"`（Primary/Secondary/Tertiary を同グループ扱い）
- 付随修正（任意だが推奨）
  - コメント文言の更新（「Primary/Accent」→「Primary/Secondary/Tertiary/Accent」など）

## Risks / Edge cases
- Secondary/Tertiary が存在しないハーモニータイプ/生成経路でも落ちない（分岐追加のみで自然に満たす）
- 名前編集で `palette.name` が変わっても、`derivedFrom` 付きなら拾える（フォールバック設計）

## Test plan
- `bun test`（少なくとも `src/ui/demo/views/palette-view.test.ts` を含む）
- `bun run type-check`（型の取りこぼし防止）
- `bun run lint`（スタイル逸脱検知）
- 可能なら Playwright で「トークン一覧にセカンダリ/ターシャリが出る」確認（重ければ任意）

## Acceptance criteria
- パレットビューの「トークン一覧」に **セカンダリ/ターシャリ行が追加される**（該当パレットが存在する場合）
- 既存の Primary/Accent/セマンティック表示は崩れない

