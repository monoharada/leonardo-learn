# Playwright E2Eの失敗（UI更新追従）の修正

## Context
- 現状のUI実装に対して、E2Eテスト側が旧UI（Harmonyのカード表示、アクセント数セレクト等）を前提にしており、広範囲で失敗している。
- 代表例：
  - Harmony View はデフォルトで Coolors モードが有効（カードDOMが存在しない）
  - アクセント数UIは `<select>` からラジオグループに置き換わっている
  - 背景色ピッカーは light/dark の2つが存在し、strict locatorで衝突する
  - CUDテストページが localStorage 復元より優先して初期モードを上書きしている
  - Semantic role overlay の「丸表示」対象が（DADSではなく）ブランド由来のHarmonyロール中心に変更されている

## Scope
- やること：
  - 失敗しているE2E（`e2e/*.e2e.ts`）を、現状UI/仕様に追従するよう更新
  - 必要に応じて E2E用テストページ（`e2e/*.html`）を最小変更で修正
  - フルE2Eを再実行し、失敗ゼロを確認
- やらないこと：
  - 仕様の巻き戻し（E2EのためにUI実装を旧仕様へ戻す）
  - 意味のある要件変更（表示/挙動を変える本番コード改修）をE2E修正と同時に行う
  - 重要なアサーションを外して「通すだけ」にする（必要最小限の緩和に留める）

## Assumptions
- `playwright.config.ts` の `baseURL`/`webServer` を前提に `bun run test:e2e` が動作する。
- E2Eは `data-testid` と安定class（コンポーネント名/役割に紐づくもの）を優先して参照する。
- 全体lintは既存診断で落ちるため、差分ファイル中心のlint確認を優先する。

## Risks / Edge cases
- UIが動的に再描画される箇所（モード切替、オーバーレイ、履歴復元）で、待ち条件が弱いと flaky になる。
- strict locator の衝突（同一classが複数存在）を `.first()` 等で解消する際、意図しない要素を掴むリスクがある。
- Semantic role overlay の仕様差を誤読すると、テストが「期待」ではなく「実装追従」になりすぎる可能性がある。

## Action items
1. 承認済みPlanを `.codex/plans/2026-01-14-fix-e2e-failures.md` に保存（完了条件: ファイルが作成され、対象/非対象が明記されている）
2. Harmony系E2Eのセレクタを Coolors/Sidebar 前提に更新し、アクセント数ラジオの期待値を修正（完了条件: 関連specが単体で通る）
3. 背景色変更E2Eの strict locator を解消（light/darkを明示）し、保存/復元も現実装に合わせる（完了条件: `background-color-change.e2e.ts` が通る）
4. CUD / Semantic role のE2Eとテストページを現仕様に合わせて修正（完了条件: 各specが単体で通る）
5. `bun run test:e2e` をフル実行して失敗ゼロを確認し、必要に応じて待ち条件を強化（完了条件: E2E全体が green）

## Test plan
- `bun run test:e2e`
- `bun test`
- `bun run type-check`
- `bun run build`

## Open questions
- なし
