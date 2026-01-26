# E2E failures 修正（monoharada/e2e-failures）

## 目標
- `bun run test:e2e` / `CI=1 bun run test:e2e` ともに failures 0 にする

## 背景
- E2E が失敗している（以前の実行では “18 failures”）。
- 現状の `test-results/*/error-context.md` から、少なくとも以下が失敗していることを確認済み:
  - `e2e/semantic-role-overlay.e2e.ts`: DADS公式ロール（Error/Warning/Link）の swatch が `dads-swatch--circular` になってしまう
  - `e2e/pastel-contrast.e2e.ts`: Pastel/Default のコントラスト検証が落ちる

## スコープ
- やること：
  - failures 一覧を再現・確定
  - `semantic-role-overlay` の円形化条件を E2E 期待に合わせて修正
  - Studio の生成（特に Secondary/Tertiary）を preset の min contrast に合わせる
  - 必要ならユニットテスト追加で回帰防止
  - 仕上げに `bun test` / `lint` / `type-check` / `build` / full e2e を再実行
- やらないこと：
  - `src/ui/styles/components.css`（5692行）の分割
  - E2E 修正に直接関係しない大規模リファクタ

## 前提 / 制約
- Playwright の webServer が `bun run build && npx serve . -l 3000` を使うため、`3000` 番ポート競合を都度解消する。
- “テストの期待が仕様” を優先し、まず実装側で満たす（必要最小限のテスト修正は最後に検討）。
- DADS step 付きの色は **最終的に DADS トークンである必要がある**。
  - 対応方針: コントラスト要件を満たせない場合は **(A) step を別の DADS トークンに寄せて維持** を優先する。
  - `hex@step` で hex を調整して token 不整合を作らない（必要なら `step` を落とす/選び直す）。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/semantic-role/semantic-role-overlay.ts`
  - DADS公式ロール（`source: "dads"` のみ）の swatch は円形化しない（tooltip/ARIA 付与は維持）
- Studio（Pastel/Default のコントラスト）
  - Secondary/Tertiary の導出が preset の `minContrast` と整合するようにする
  - DADS step 選択は「目標以上」を優先し、不足時は DADS token 範囲でフォールバックする

### その他（Docs/Marketing/Infra など）
- 必要なら `src/ui/semantic-role/semantic-role-overlay.test.ts` 等に回帰テストを追加
- 必要なら `.context/` に failures 一覧（再現条件込み）を保存

## 受入基準
- [ ] `bun run test:e2e` が failures 0
- [ ] `CI=1 bun run test:e2e` が failures 0
- [ ] `e2e/semantic-role-overlay.e2e.ts` の `Error/Warning/Link` が “円形化しない” を満たす
- [ ] `e2e/pastel-contrast.e2e.ts` が全てパスする
- [ ] `bun test` / `bun run type-check` / `bun run lint` / `bun run build` がパスする

## リスク / エッジケース
- コントラスト確保のため配色（特に Secondary/Tertiary）が変わり、見た目が変化する可能性
- DADS step と hex の不整合が起きやすい（`hex@step` の一貫性が必須）
- 非CI（並列）でのみ出る不安定要因（タイミング/状態汚染）に注意

## 作業項目（Action items）
1. E2E を `CI=1` と非CIで再実行し、failures 一覧を確定する（完了条件: 失敗テスト名/ファイル/再現条件が一覧化される）
2. `semantic-role-overlay` の円形化条件を修正する（完了条件: `e2e/semantic-role-overlay.e2e.ts` の該当失敗が解消）
3. 必要なら `semantic-role-overlay` のユニットテストを追加/更新する（完了条件: 回帰をユニットテストで検出できる）
4. Secondary/Tertiary の導出を preset `minContrast` と整合させる（完了条件: `e2e/pastel-contrast.e2e.ts` がパスする）
5. DADS token の step 選択を「目標以上優先」に調整する（完了条件: DADS token のままコントラスト要件を満たす）
6. 影響範囲の `bun test` / `type-check` / `lint` / `build` を確認する（完了条件: 全てパス）
7. full e2e を `CI=1` / 非CIの両方で実行し、failures 0 を確認する（完了条件: 受入基準が全て満たされる）

## テスト計画
- Full: `bun run test:e2e` / `CI=1 bun run test:e2e`
- Focused: `bunx playwright test e2e/semantic-role-overlay.e2e.ts --workers=1`
- Focused: `bunx playwright test e2e/pastel-contrast.e2e.ts --workers=1`
- Unit/Static: `bun test` / `bun run type-check` / `bun run lint` / `bun run build`

## オープンクエスチョン
- 該当なし（方針確定: CI/非CI両方を目標、DADS token を最優先）

