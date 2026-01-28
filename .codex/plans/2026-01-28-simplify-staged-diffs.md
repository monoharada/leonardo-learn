# ステージ済み差分（9ファイル）のコード簡素化（挙動不変）

## 目標
- 既存の挙動（導出結果・UI挙動・テスト期待値）を変えずに、読みやすさ/保守性を上げる
- 重複ロジックや冗長な分岐・例外処理を整理し、責務の境界を明確にする
- テストのデータ定義をDRYにして、意図が読み取れる形にする

## 背景
- `src/core/key-color-derivation/deriver.ts` 周辺が複雑化しており、読み解きコストが高い
- `src/core/key-color-derivation/deriver.test.ts` のDADSトークン定義が冗長で、テスト意図が埋もれやすい
- `src/ui/demo/views/manual-view.render.ts` に再描画・永続化・非同期ハンドリングが散っており、追跡コストが高い

## スコープ
- やること：
  - **現在ステージされている差分ファイル（9ファイル）だけ**を、挙動不変で簡素化する
  - 小さなpure関数抽出、重複の局所ヘルパー化、命名整理、不要コード削除（未使用変数/到達不能など）
  - テストコードのヘルパー化（同じ期待値を保ったまま短くする）
- やらないこと：
  - アルゴリズム仕様の変更（導出結果や選好が変わるような変更）
  - 公開APIの互換性破壊（exportの増減・型の破壊的変更）
  - 新規の `src/` ファイル追加（このタスクでは行わない）
  - 依存追加、設定変更、ロックファイル更新

## 対象ファイル
- `.codex/plans/2026-01-27-fix-key-color-derivation-pst.md`（参考資料）
- `.codex/plans/2026-01-28-dads-warm-key-cvd-avoidance-v2.md`（参考資料）
- `src/core/key-color-derivation/deriver.ts`
- `src/core/key-color-derivation/deriver.test.ts`
- `src/core/key-color-derivation/types.ts`
- `src/core/tokens/dads-data-provider.ts`
- `src/ui/demo/palette-generator.ts`
- `src/ui/demo/views/manual-view.render.ts`
- `src/ui/demo/views/studio-view.generation.ts`

## 受入基準
- [ ] `bun test` が通る
- [ ] `bun run type-check` が通る
- [ ] `bun run lint` が通る
- [ ] key-color導出（seed再現性/閾値固定/回帰テスト）の期待値が変わらない
- [ ] Manual view の操作（背景色/テキスト色/キーカラー変更）で既存の再描画/永続化挙動が変わらない

## 作業項目（Action items）
1. 対象ファイルと「変えてはいけない点」を整理する。（完了条件: 不変条件が箇条書きで揃う）
2. `deriver.ts` を関数抽出・命名整理で読みやすくする。（完了条件: ネスト/重複が減り、責務単位で追える）
3. `dads-data-provider.ts` の重複/冗長を局所整理する。（完了条件: 同じ挙動で読みやすい）
4. `deriver.test.ts` のトークン定義/繰り返しをヘルパー化する。（完了条件: テストの意図が短く読める）
5. `manual-view.render.ts` の再描画・永続化・非同期ハンドリングをヘルパー化する。（完了条件: 追跡が容易で挙動は同一）
6. `palette-generator.ts` / `studio-view.generation.ts` の小さな整理（未使用/冗長削除）を行う。（完了条件: 変更が局所で安全）
7. `bun test` / `bun run type-check` / `bun run lint` を実行して確認する。（完了条件: 全て成功）

## テスト計画
- `bun test`
- `bun run type-check`
- `bun run lint`

