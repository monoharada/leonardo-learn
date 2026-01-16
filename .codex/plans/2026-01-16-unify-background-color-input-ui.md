# 背景色入力UIのスタイル統一（生成ビュー基準）+ HEX入力幅の確保

## Context
- 現状、パレット/シェード側は `BackgroundColorSelector`（`src/ui/demo/background-color-selector.ts`）、生成ビュー（Harmony）は `src/ui/demo/views/harmony-view.ts` の背景色入力UIで、見た目・サイズ・余白が揃っていない。
- 生成ビュー側の背景色HEX入力（`.dads-input--bg-color`）が、レイアウト状況によっては `#RRGGBB`（7文字）分の幅を確保できず、表示が詰まる。

## Scope
- やること：
  - 生成ビュー（Harmony）の背景色HEX入力が `#RRGGBB` を常に表示できる最小幅を確保する（flexで潰れない）。
  - パレット/シェード（`BackgroundColorSelector`）の背景色入力UIを、生成ビューの見た目（DADS系入力）に寄せて統一する。
  - `BackgroundColorSelector` のラベル文言を日本語化（生成ビューの日本語に合わせる）。
  - 既存テストで参照されているクラス（例: `.background-color-selector__color-picker`）は維持し、挙動を変えずにスタイルを揃える。
- やらないこと：
  - 入力バリデーション/永続化/再レンダリング等の挙動変更（スタイル変更が主）。
  - 画面構成の大幅変更（項目の増減やワークフロー変更）。

## Assumptions
- 「生成ビューに揃える」は、入力のサイズ/枠線/角丸/余白/配置（label + HEX + color picker）を統一することを指す。
- HEX入力幅は「固定（#RRGGBB分）」で揃える。

## Risks / Edge cases
- `.dads-input--bg-color` / `.dads-input--color` の flex調整が、Harmonyヘッダー内の他レイアウトに影響する可能性。
- パレットビューは `.background-color-selector` が入れ子になっており（`palette-view.ts`）、CSSの効き方が不安定になる可能性（要整理）。
- テストがクラス名に依存しているため、クラス名の削除/変更は避ける必要がある。

## Action items
1. `src/ui/styles/components.css` で `.dads-input--bg-color` の最小幅を `#RRGGBB` 分に固定し、潰れないようにする。（完了条件: 生成ビューでHEXが常に7文字表示できる）
2. `src/ui/styles/components.css` で `.dads-input--color` が固定サイズを維持するようにする。（完了条件: color input が伸び縮みしない）
3. `src/ui/demo/background-color-selector.ts` で、入力にDADS系クラスを付与し、レイアウトを生成ビュー基準に寄せる。（完了条件: パレット/シェードで入力見た目が統一される）
4. `src/ui/styles/components.css` の `.background-color-selector__*` を生成ビュー基準に調整（カード/行/エラーの見た目）。（完了条件: 既存UIとの差がなくなる）
5. `src/ui/demo/views/palette-view.ts` の wrapper クラスを整理し、`.background-color-selector` の二重適用を解消。（完了条件: DOMが1段になり、意図したCSSが当たる）
6. `src/ui/demo/background-color-selector.test.ts` のラベル期待値を日本語に更新。（完了条件: テストがパスする）

## Test plan
- `bun test`
- `bun run type-check`
- 目視: 生成（Harmony）/ パレット / シェードで「HEXが潰れない」「見た目が揃う」を確認

## Open questions
- `BackgroundColorSelector` のラベル文言も日本語化しますか？
  - Answer: はい（生成ビューに合わせる）
- HEX入力の幅は「固定（#RRGGBB分）」で揃えるのが良いですか？
  - Answer: はい（固定でOK）

