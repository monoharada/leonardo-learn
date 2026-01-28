# P/S/T（Primary/Secondary/Tertiary）キーカラー導出ロジックの修正（DADS準拠）＋Studio/Manual/URL整合

## 目標
- Secondary/Tertiary の導出を **DADSドキュメント準拠**（隣接UIで背景に対して **少なくとも 3:1**、Tertiary は Secondary と **反対の明度方向**）に直す
- Studio 生成・Studio URL 復元・Manual の「P変更→S/T自動更新」で、**同じルールでS/Tが決まる**ようにする
- **DADS以外の色を使って良いのは、Primary が DADS 以外のときのみ**（Primary が DADS のときは Secondary/Tertiary も DADS トークンから選択）

## 背景
- 現状 `src/core/key-color-derivation/deriver.ts` は tertiaryDirection が背景固定になっており、Secondary と反対方向にならないケースがある。
- `src/core/key-color-derivation/types.ts` の `DADS_CONTRAST_DEFAULTS.tertiary` が 1.5 で、DADSドキュメント（隣接UIで 3:1）と不整合。
- Studioの「生成」と「URL復元」で `createDerivedPalettes(...)` の呼び方が揃っておらず、復元時にデフォルトへ落ちて結果がズレる可能性がある。
- Manualは `handleKeyColorChange` が TRIADIC 由来で S/T を作っており、P/S/T（同色相・明度違い）というDADSの意図と揃っていない。

## スコープ
- やること：
  - key-color-derivation のデフォルト/方向判定をDADS仕様へ寄せる（S/T ともに UI用途は 3:1 以上、T は S と反対方向）
  - Studio生成・URL復元で S/T 導出のパラメータを統一する
  - Manual の P 変更時は常に S/T を自動更新（TRIADICではなく key-color-derivation へ寄せる）
  - 回帰テスト追加/更新で仕様を固定する
- やらないこと：
  - UIレイアウト変更
  - Primary が 4.5:1 を満たさない入力を禁止する等の入力制約追加（別タスク）

## 前提 / 制約
- DADSドキュメント要点：
  - Secondary/Tertiary（隣接UI用途）：主要背景に対して **少なくとも 3:1**
  - Tertiary：Secondary と反対の明度方向
- Studio preset の `minContrast`（3/4.5/7）は **Secondary/Tertiary 両方のターゲットとして適用**（Option A）
- Manual は P 変更で S/T を常に自動更新してよい（ユーザー承認済み）
- DADS以外の色を使ってよいのは Primary が DADS以外のときのみ（ユーザー承認済み）

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/core/key-color-derivation/types.ts`
  - `DADS_CONTRAST_DEFAULTS.tertiary` を 3.0 に変更
- `src/core/key-color-derivation/deriver.ts`
  - Tertiary の明度方向を Secondary の反対にする（DADS/HCT両方）
  - 「target を満たす候補がある場合は未達を選ばない」選択ルールにする
  - DADSモードは Primary が DADS の場合のみ使用し、Secondary/Tertiary は DADSトークンから選ぶ（Primary が DADS のときに非DADSを出さない）
- `src/ui/demo/views/studio-view.generation.ts` / `src/ui/demo/index.ts`
  - Studio生成とURL復元で `createDerivedPalettes` の options を統一（secondary/tertiary とも preset minContrast を渡す）
- `src/ui/demo/views/manual-view.render.ts`
  - `handleKeyColorChange` の S/T 自動生成を `deriveSecondaryTertiary` ベースへ変更（P変更で常に自動更新）

### その他
- 該当なし

## 受入基準
- [ ] light/dark背景で Secondary/Tertiary が（可能な場合）背景に対して **target 以上**になる（target は preset minContrast）
- [ ] Tertiary の明度方向が常に Secondary と **反対**になる
- [ ] Primary が DADS の場合、Secondary/Tertiary も DADSトークンから選ばれ（`@step` が付く等）、非DADSを出さない
- [ ] Studioの「生成」と「URL復元」で Secondary/Tertiary の導出パラメータが一致する
- [ ] ManualでPrimaryを変更すると Secondary/Tertiary が常に自動更新される

## リスク / エッジケース
- 既存の見た目が変わる可能性（特に tertiary の用途・テーマ背景）
- Primary が低コントラストの場合、反対側で target を満たす色が存在しないことがある（その場合は「最善のDADS候補」へフォールバックが必要）
- DADS token の hex を調整すると step 表示とズレるため、`@step` 付きは調整しない/しない設計を維持する

## 作業項目（Action items）
1. DADS準拠の定数へ更新（完了条件: tertiary のデフォルトが 3.0 になる）
2. HCTモードの tertiaryDirection を Secondary の反対へ修正（完了条件: unit test で方向が固定される）
3. DADSモードの Secondary/Tertiary 選択に「Primaryを挟む反対側」を反映（完了条件: DADS primary で S/T が反対側になりやすい）
4. Studio生成/URL復元で `createDerivedPalettes` options を統一（完了条件: 呼び出しが一致する）
5. Manualの P 変更で `deriveSecondaryTertiary` を使って S/T を常に自動更新（完了条件: manual-view.test で担保）
6. テスト実行（完了条件: `bun test` が通る）

## テスト計画
- `bun test src/core/key-color-derivation/deriver.test.ts`
- `bun test src/ui/demo/views/manual-view.test.ts`
- `bun test src/ui/demo/views/studio-view.test.ts`（必要最小限）

