# Code Review: `monoharada/ci-biome-zero-warn`

## 目標
- このブランチの変更が「CI安定化（lint/build追加・lockfile固定）＋Biome警告ゼロ運用」に対して妥当かをレビューし、必要ならフォローアップ案を整理する

## 背景
- 変更の主旨は、`biome lint` を **warning でも fail** にし（`--error-on-warnings`）、CI/Deploy で `--frozen-lockfile` を徹底しつつ、リポジトリ内の警告を解消するもの
- ローカル確認（2026-01-24 時点）:
  - `bun run lint` ✅（`--error-on-warnings` でも warning 0）
  - `bun run type-check` ✅
  - `bun test` ✅
  - `bun run build` ✅

## スコープ
- やること：
  - 変更点の妥当性（意図どおり/回帰リスク/可読性/運用影響）をレビュー
  - 追加で直すなら最小差分のフォローアップ案を提示
- やらないこと：
  - 仕様追加やCI構成の大幅な再設計

## 前提 / 制約
- GitHub Actions 上の最終的な成功確認は手元では確定できないため、手元で通ること＋ワークフロー差分の妥当性で判断する
- vendored CSS の `!important` は運用上必要になり得るため、例外は「局所・理由付き」に限定する

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/styles/components.css` で実験的 `::picker(select)` を局所 suppress し、Biome の `noUnknownPseudoElement` による失敗を回避
- HTML テストページ等で不要な `!important` の削除や、未使用変数の整理（主に lint 対応）

### その他（Docs/Marketing/Infra など）
- `.github/workflows/ci.yml` に `Lint` / `Build` を追加（既存 job 内 step 追加）
- `.github/workflows/deploy.yml` の依存解決を `bun install --frozen-lockfile` に固定
- `package.json` の `lint` を `biome lint . --error-on-warnings` に変更し「warning ゼロ」を強制
- `biome.json` で vendored な `src/ui/styles/dads-html-preview.css` の `noImportantStyles` を file-scope で off

## 受入基準
- [ ] `bun run lint` が `--error-on-warnings` 前提でも exit 0
- [ ] `bun run type-check` / `bun test` / `bun run build` が成功
- [ ] GHA `CI` が `Lint`/`Type check`/`Unit tests`/`Build` まで success
- [ ] GHA `Deploy to GitHub Pages` が `--frozen-lockfile` 前提で success
- [ ] lint 例外は「理由のある局所対応」だけ（vendored CSS / 実験的CSS）

## リスク / エッジケース
- `::picker(select)` は実験的仕様なので、将来のブラウザ挙動/互換性や lint ルール追従で要見直しになり得る
- Deploy の artifact 取り扱い次第では、成果物以外（例: `node_modules`）が混ざってサイズ/時間のリスクになり得る（現状の `path: '.'` 設定）

| index | line number(s) | code | issue | potential solution(s) |
|---:|---|---|---|---|
| 1 | `.github/workflows/deploy.yml:44` | `path: '.'` | `bun install` 後の `node_modules` 等が Pages artifact に混ざる可能性（容量/時間/失敗率） | upload 前に不要物を除外する（例: `rm -rf node_modules`） |
| 2 | `biome.json:21` | `overrides`（`dads-html-preview.css`） | vendored CSS 例外は妥当だが、今後増えると散らばりやすい | vendor 配下に集約して override もまとめる（必要になったら） |
| 3 | `src/ui/styles/components.css:1627` | `biome-ignore ... noUnknownPseudoElement` | suppress の理由は明確だが、将来「ルール側が対応」した際に不要になる | ルール追従時に suppress を外せるようコメントを維持 |

## 作業項目（Action items）
1. 変更点が CI/lint 運用強化に閉じていることを確認（完了条件: “意図しない機能変更” がないと判断できる）
2. `bun run lint`（`--error-on-warnings`）を確認（完了条件: warning 0 で成功）
3. `bun run type-check` を確認（完了条件: exit 0）
4. `bun test` を確認（完了条件: exit 0）
5. `bun run build` を確認（完了条件: exit 0）
6. GHA `CI` が最新コミットで success になることを確認（完了条件: workflow 全体 success）
7. GHA `Deploy to GitHub Pages` が最新コミットで success になることを確認（完了条件: workflow 全体 success）
8. （任意）Deploy artifact 範囲の最適化を検討（完了条件: upload に不要物が混ざらない）

## テスト計画
- `bun run lint`
- `bun run type-check`
- `bun test`
- `bun run build`

## オープンクエスチョン
- Deploy の `path: '.'` は意図どおり（成果物＋周辺ファイル全部を Pages に載せたい）ですか？それとも成果物だけに絞りたいですか？

