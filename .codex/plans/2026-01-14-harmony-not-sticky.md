# Harmonyを下部固定（非オーバーレイ）にする

## Context
- 低い画面高のとき、「ハーモニー」行（`.harmony-sidebar-section` / `.harmony-sidebar`）が見えている一方で、メインのカラーバー（`.coolors-display`）下部の色コード等（`.coolors-column__hex` など）が見切れる。
- 現状 `.coolors-display` が `height: min(70vh, 600px)` 固定のため、親（`.coolors-layout__main`）の実高さより大きいと `overflow: hidden` で下側がクリップされ、結果として色コードが見えない。
- 関連箇所:
  - `src/ui/styles/components.css`（`.coolors-display`, `.coolors-layout*`, `.harmony-sidebar*`）
  - `src/ui/demo/views/harmony-view.ts`（Coolorsモードで `.coolors-layout` を組み立て）
  - `src/ui/components/coolors-palette-display.ts`（`.coolors-display` のDOM）

## Scope
- やること：
  - ハーモニー行をオーバーレイさせず、画面下に「レイアウトとして」置く
  - メインのカラーバーが、ハーモニー行を除いた残り高さを埋めるようにする（vh固定をやめる）
  - 低い画面高で色コードが見えることを確認する
- やらないこと：
  - パレット生成ロジックやUI仕様の大幅変更
  - 画面全体のスクロール設計の全面見直し（必要なら別途）

## Assumptions
- 問題は「生成」タブ（`#harmony-view`）のCoolors表示（`.coolors-display`）で再現している。
- 望ましい挙動は「ハーモニー行は下に常設されるが、メインバーと重ならない（クリップ/被りなし）」。

## Risks / Edge cases
- 極端に低い高さだと、ヘッダー + ハーモニー行だけで高さを使い切り、メインバー内テキストが物理的に収まらない可能性（ベストエフォート）。
- `min-height: 0` が不足すると、flex子要素が縮まずに再び見切れが出る可能性。

## Action items
1. 低画面高での再現条件を固定（viewport高さを小さく）。（完了条件: 色コードが見切れる状態を確認できる）
2. `src/ui/styles/components.css` の `.coolors-display` の `vh` 固定高さを撤廃し、親高さに追従する指定に変更。（完了条件: `.coolors-display` が親の残り高さを使う）
3. ハーモニー行（`.coolors-layout__sidebar`）が常に下に残り、メインバーと重ならないことを確認。（完了条件: 色コード/トークン名が見える状態でハーモニー行も表示される）
4. Playwrightで短いviewportの回帰テストを追加（可視領域/重なりを検証）。（完了条件: 新規テストが安定してパス）
5. `bun test` と `bun run test:e2e`（必要ならgrep）で確認。（完了条件: すべてパス）

## Test plan
- `bun test`
- `bun run test:e2e -- --grep "harmony-ui-brushup"`
- 低い画面高で、「メインの色コードが見える」「ハーモニー行が下にあり、重ならない」を確認

## Open questions
- 画面高が極端に小さい場合でも“色コードを必ず表示”したいですか？
  - Answer: ベストエフォート
