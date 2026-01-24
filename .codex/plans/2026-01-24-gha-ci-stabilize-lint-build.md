# GHA CIの安定化（lint/build追加 + deployのlockfile固定）

## 目標
- 現在の見た目・機能を維持したまま、GHA の `CI` / `Deploy to GitHub Pages` が安定して通り続ける状態にする
- PR の必須品質ゲートとして `bun run lint`（Biome）を CI に組み込む（※緩和はしない）

## 背景
- ローカルで GHA 相当を実行し、`type-check` / `test` / `build` は成功した
- 一方で `bun run lint` は現状落ちる（Biome lint: `errors=1`）
  - エラー内容: `src/ui/styles/components.css` の `::picker(select)` が `lint/correctness/noUnknownPseudoElement` でエラー扱い
- GitHub の branch protection / required checks は API からは未認証で取得できない（401）。
  - ただし `main` の最新コミットでは check run が `test` / `build` / `deploy` の3つであることは確認できている

## スコープ
- やること：
  - `bun run lint` が通るように **実コードを修正**し、CI に必須化する
  - PR で `build` 破壊も検知できるよう CI に `bun run build` を追加する
  - Deploy の依存解決を `--frozen-lockfile` で固定し、再現性を上げる
- やらないこと：
  - CI を緩くする／失敗を握りつぶす（skip/continue-on-error/`|| true`/設定で雑にignore等）
  - 見た目や仕様変更を目的とした改変

## 前提 / 制約
- branch protection の required checks はこちらから直接は確定できないため、**check run 名を増やさない方針**で進める（= lint/build は既存 `CI` の job 内 step として追加）
- Biome の `::picker(select)` は実装意図が「実験的CSS対応」なので、機能維持を優先しつつ lint を成立させる

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- 該当なし（見た目・機能は維持）

### その他（Docs/Marketing/Infra など）
- `src/ui/styles/components.css`: `::picker(select)` に対する **Biome の単発エラー**を解消（局所的な ignore か、同等表現への置換で意図を維持）
- `.github/workflows/ci.yml`: `bun run lint` と `bun run build` を **既存 job（test）内の step**として追加
- `.github/workflows/deploy.yml`: `bun install` → `bun install --frozen-lockfile` に変更（依存ドリフト防止）

## 受入基準
- [ ] `bun run lint` がローカルで exit 0 になる
- [ ] GHA `CI` が `lint` / `type-check` / `test` / `build` まで完走して success
- [ ] GHA `Deploy to GitHub Pages` が `bun install --frozen-lockfile` 前提で success
- [ ] CI を緩くする変更が入っていない（例外的ignoreは「Biomeが未対応の仕様」を理由にした局所対応のみ）
- [ ] 見た目・機能の差分が発生していない（主要導線のスモークで確認）

## リスク / エッジケース
- `::picker(select)` は新しめのCSSで、Biome側の追従が遅れている可能性がある（= lint通過のための“正当な局所例外”が必要）
- lint 警告は大量に残る可能性がある（ただし現状 Biome は警告で exit 1 にはならない）。将来的に警告もゲートにする場合は別途まとまった整理が必要

## 作業項目（Action items）
1. 現状のCI相当手順＋lintをローカルで再確認（完了条件: `type-check`/`test`/`build` は成功、`lint` の唯一の error を再現）
2. Biome の error（`noUnknownPseudoElement`）を最小差分で解消（完了条件: `bun run lint` が exit 0）
3. `ci.yml` に `bun run lint` を追加（完了条件: workflow に lint step が入り、job名は増えない）
4. `ci.yml` に `bun run build` を追加（完了条件: PR段階で build 破壊が検知される）
5. `deploy.yml` の install を `--frozen-lockfile` に変更（完了条件: deploy の依存解決が固定される）
6. 変更後にローカルで再実行（完了条件: `lint`/`type-check`/`test`/`build` が全て成功）
7. GHA で `CI` / `Deploy` の最新runが success になることを確認（完了条件: どちらも success）

## テスト計画
- `bun install --frozen-lockfile`
- `bun run lint`
- `bun run type-check`
- `bun test`
- `bun run build`

## オープンクエスチョン
- 該当なし（lintは「まず通す」を優先。警告もfailさせる運用にするかは、CI安定化後に別チケット推奨）

