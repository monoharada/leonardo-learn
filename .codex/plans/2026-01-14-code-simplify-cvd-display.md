# CVD表示対応差分のコード簡素化（code-simplifier適用）

## Context
- `~/.codex/skills/` に `plan-mode` と `code-simplifier` が存在することを確認済み
- 対象差分（未コミット）:
  - `src/ui/accent-selector/accent-candidate-grid.test.ts`
  - `src/ui/accent-selector/accent-candidate-grid.ts`
  - `src/ui/components/coolors-palette-display.test.ts`
  - `src/ui/components/coolors-palette-display.ts`
  - `src/ui/demo/cvd-controls.ts`
  - `src/ui/demo/views/harmony-view.ts`
  - `src/ui/demo/views/palette-preview.ts`
  - `src/ui/demo/views/palette-view.ts`

## Scope
- やること：上記差分ファイルを対象に、挙動を変えずに重複・冗長さを減らし読みやすくする
- やらないこと：仕様追加、公開APIの互換性破壊、依存追加、広域リネーム、全体フォーマット、無関係ファイルの整理（`doc/`含む）

## Assumptions
- CVD切替は「表示のみ変える / クリック等は元HEX維持」のまま
- 検証は `bun test` / `bun run type-check` / `bun run lint` を優先できる

## Risks / Edge cases
- `colors`（元）と `displayColors`（表示）を取り違えると、クリック時に渡るHEXや表示HEXが逆転する
- `harmony-view.ts` のプレビューMap変換や `palette-preview.ts` のCSS変数設定は、変換漏れ/二重変換が起きやすい
- JSDOMは `style.backgroundColor` が `rgb(...)` になるため、テスト側の期待値と整合を崩しやすい

## Action items
1. 対象ファイルを確定（完了条件: 対象8ファイルの一覧を固定）
2. 規約/既存資産を確認（完了条件: 既存ユーティリティ採用/不採用の判断ができる）
3. `harmony-view.ts` の重複を局所ヘルパーで整理（完了条件: 重複ブロックが減る）
4. `palette-preview.ts` の `style.setProperty` 群を単純化（完了条件: 同一設定を保ちつつ重複削減）
5. `cvd-controls.ts` の表示HEX生成を微調整（完了条件: ロジック同一で見通しが良くなる）
6. `coolors-palette-display.ts` / `accent-candidate-grid.ts` の軽い整理（完了条件: API/挙動そのまま）
7. 追加テストのボイラープレート整理（完了条件: 意図/期待値は同一のまま短くなる）
8. `bun run lint` / `bun run type-check` を実行（完了条件: 通る）
9. `bun test` を実行（完了条件: 通る）

## Test plan
- `bun run lint`
- `bun run type-check`
- `bun test`

