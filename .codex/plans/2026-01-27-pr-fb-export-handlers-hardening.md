# PR FB対応: ExportハンドラのDRY化 + 堅牢化

## 目標
- Export関連の小さな懸念（重複/将来耐性）を解消しつつ、現状のエクスポート内容とUI挙動を維持する。

## 背景
- 現ブランチで Export を「1ロール=1トークン」へ整理し、DADS primitives/semantic/link を export に含め、Tailwind export を standalone 化した。
- PR FB（レビュー指摘）として以下が残っている:
  - `buildDadsTokenTree()` が想定外の semantic token ID 形式だと落ちる/欠落する可能性
  - `setupExportHandlers()` の `close` リスナーが再初期化時に多重登録されうる
  - ロール割当ロジック（primary/secondary/tertiary/accent-*）が複数箇所に重複
  - semantic/link のエイリアス定義が複数箇所に重複（将来の差分混入リスク）

## スコープ
- やること：
  - Exportハンドラ内の重複ロジックをヘルパー化して再利用する（挙動は維持）。
  - DADS token tree 生成を「想定外入力でも落とさず保持」方向に寄せる。
  - `setupExportHandlers()` のイベント登録を再実行に強くする。
- やらないこと：
  - エクスポート仕様の大幅変更（キー名/構造/フォーマットの刷新）。
  - UI刷新、依存追加、大規模リファクタ。

## 前提 / 制約
- 既存テスト（`bun test`）が通ることを必須とする。
- `setupExportHandlers()` は通常1回の初期化想定だが、HMR/再初期化でも安全に動くことを目標にする。
- 出力の並び順や空行など「見た目」は極力維持する（差分最小）。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/demo/export-handlers.ts`
  - ロール割当を1箇所に集約:
    - 例: `getExportRoleAssignments(palettes)` のような「roleKey + palette」を順序付きで返すヘルパーを追加し、
      `generateExportRoleColors()` / `exportCssWithDadsTokens()` / `buildExportCssVariableMap()` で共通利用する。
  - semantic/link alias の参照生成を1箇所に集約:
    - 例: `getSemanticLinkAliasVarRefs(warningPattern)` を作り、CSS出力と root var map の両方で再利用する。
  - `setupExportHandlers()` の `exportDialog` close リスナーを多重登録しない:
    - 例: モジュールスコープに「直前に紐づけた dialog と handler」を保持し、再セット時に `removeEventListener` してから追加する。
  - `buildDadsTokenTree()` の堅牢化:
    - `success/error/warning` で `index/pattern` が欠けるケースは `continue` せず、`semantic[suffix] = leaf` にフォールバックして欠落を避ける。

### その他（Docs/Marketing/Infra など）
- 該当なし

## 受入基準
- [ ] `src/ui/demo/export-handlers.ts` 内でロール割当ロジックの重複が解消され、単一のヘルパーに集約されている。
- [ ] semantic/link alias の生成が単一のヘルパーに集約され、CSS export と Tailwind root vars で同一ソースを参照している。
- [ ] `setupExportHandlers()` を複数回呼んでも `exportDialog` の `close` リスナーが多重登録されない（少なくともコード上保証される）。
- [ ] `buildDadsTokenTree()` が想定外の semantic token ID 形式でも token を欠落させず保持できる。
- [ ] 既存のエクスポート内容（主要キー: `--color-primary`, `--color-success`, Tailwind `success.DEFAULT` 等）と、`.studio-export-btn` からのダイアログ挙動が維持される。
- [ ] `bun test src/ui/demo/export-handlers.test.ts src/core/export/css-exporter.test.ts src/core/export/tailwind-exporter.test.ts` が green。

## リスク / エッジケース
- ヘルパー化でロール割当の順序/命名が変わると互換性が崩れる → 既存テストを維持し、必要なら追加のスナップショット/contains テストで担保。
- CSS出力の並び順が変わるとレビュー差分が大きくなる → 出力セクション構造（DADS→roles→aliases）を維持する実装にする。
- イベントの remove/add 周りで別 document/JSDOM 環境が絡む → 参照保持は「同一要素」に限定し、安全に `null` ガード。

## 作業項目（Action items）
1. `setupExportHandlers()` のイベント登録点を棚卸し（完了条件: click/close/format の登録箇所と再実行時の挙動が整理されている）
2. ロール割当ヘルパーを追加し、`generateExportRoleColors()` を置換（完了条件: roleKey 決定がヘルパー経由になっている）
3. 同ヘルパーを `exportCssWithDadsTokens()` / `buildExportCssVariableMap()` に適用（完了条件: ロール割当重複がなくなっている）
4. semantic/link alias 生成ヘルパーを追加（完了条件: alias の定義が1箇所に集約されている）
5. CSS export と root var map の alias 生成をヘルパー参照に統一（完了条件: alias 値の重複記述がなくなる）
6. `exportDialog` close リスナーの重複登録防止を実装（完了条件: 再初期化時に remove→add が保証される）
7. `buildDadsTokenTree()` の semantic フォールバックを追加（完了条件: index/pattern 欠落時も `semantic[suffix]` に格納される）
8. 影響範囲のテストを実行（完了条件: 対象 `bun test ...` が green）

## テスト計画
- `bun test src/ui/demo/export-handlers.test.ts`
- `bun test src/core/export/css-exporter.test.ts`
- `bun test src/core/export/tailwind-exporter.test.ts`
- 可能なら追加で `bun run type-check`（既存CI/運用に合わせる）

## オープンクエスチョン
- なし

