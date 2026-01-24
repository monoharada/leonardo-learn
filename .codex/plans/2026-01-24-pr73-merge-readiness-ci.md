# PR #73 マージ可否チェック（+ CI: type-check / unit test）

## 目標
- PR #73 が `main` に **マージ可能な品質**か判断する（Go / No-Go と理由を明確化）。
- PR運用として `type-check` / `unit test` をGitHub Actionsで実行し、PR上でチェック可能にする。

## 背景
- PR #73: `monoharada/pastel-contrast-fix` → `main`
- 2026-01-24 時点で `mergeable: MERGEABLE`（GitHub表示）。
- チェック（CI）は現状PRに紐づいておらず、ローカル検証が根拠になっている。

## スコープ
- やること：
  - PR #73 の差分とテスト結果を確認し、マージ可否を判断する
  - GitHub Actions に `bun run type-check` / `bun test` を追加し、PRで自動実行する
  - （必要なら）最新 `main` の取り込み可否を判断する
- やらないこと：
  - 仕様追加、依存追加、広域リネーム
  - `lint` の必須化（既存警告が多く段階的対応が必要なため）

## 前提 / 制約
- 「PRは1本のままでも、コミットが分かれていればOK」という方針で進める。
- CIの「必須化（branch protection）」はリポジトリ設定側のため、このPlanでは **ワークフロー追加**までを対象とする。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- 該当なし

### その他（Docs/Marketing/Infra など）
- `.github/workflows/ci.yml` を追加
  - `pull_request` / `push(main)` をトリガに実行
  - `bun install --frozen-lockfile` → `bun run type-check` → `bun test`

## 受入基準
- [ ] PR #73 のローカル検証が通る（`type-check` / `bun test` / `E2E(パステル絞り込み)`）
- [ ] GitHub Actions ワークフローが追加され、PR上で `type-check` と `bun test` が実行される
- [ ] 追加コミットは目的が明確で、レビュー可能な粒度である

## リスク / エッジケース
- E2EはCI環境差でフレーク化する可能性があるため、当面は `type-check` / `unit test` を必須チェックの中心にする。
- `bun.lock` と依存の同期が崩れている場合、`--frozen-lockfile` によりCIが失敗する（再現性確保のための仕様）。

## 作業項目（Action items）
1. 差分の確認とローカル検証（完了条件: `type-check` / `bun test` / `E2E(パステル)` が成功）
2. CIワークフロー追加（完了条件: `.github/workflows/ci.yml` が追加される）
3. 再度ローカル検証（完了条件: `type-check` / `bun test` が成功）
4. 変更をコミットしてPRブランチへ反映（完了条件: PR上でCIが起動する）

## テスト計画
- `bun run type-check`
- `bun test`
- `bun run test:e2e -- --grep "パステル"`（任意: フレーク化しやすい場合はローカル中心）

## オープンクエスチョン
- 詰まるほどの不明点はなし

