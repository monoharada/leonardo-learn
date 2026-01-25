# Facilities（カテゴリ導線）をタイル型リンクグリッドへ刷新（image-v6準拠）

Date: 2026-01-25
Source: `.context/attachments/image-v6.png`（ターゲット） / `.context/attachments/image-v4.png`（現状）

## 目標
- Facilities セクションを、2枚目（`.context/attachments/image-v6.png`）のような **正方形タイル＋ラベル下** の見た目に寄せる
- Facilities が **カテゴリへの遷移リンク** だと一目で分かる（押せるものが明確）
- DADS準拠で **focus-visible が明確**、かつ見切れない

## 背景
- 現状の Facilities は `src/ui/demo/views/palette-preview.ts` で `div` を動的生成し、`src/ui/styles/components.css` の `.preview-facility-icon*` で「箱の中にアイコン＋ラベル」になっている。
- 参照デザイン（image-v6）は「正方形のアイコン枠（ボーダー）」と「ラベル」を分け、グリッドでも認知負荷が低い。
- practical-ui-2nd-edition の観点では、**遷移の型を統一**（リンクとして一貫）、**色の意味重複を避ける**、**フォーカス可視性最優先**が改善ポイント。

## スコープ
- やること：
  - `src/ui/demo/views/palette-preview.ts` の Facilities アイテムを **リンク化（a要素）** し、タイル構造へ変更
  - `src/ui/styles/components.css` の Facilities を **タイル用レイアウト/状態設計** に刷新
  - 文言を「行政の空想コンテンツ」に差し替え（カテゴリ名など）
- やらないこと：
  - 実際のルーティング/遷移先の実装
  - パレット生成/色計算ロジック変更
  - 依存追加

## 前提 / 制約
- Facilities は **カテゴリへの遷移リンク**（ユーザー合意）
- `:focus-visible` をクリップしない（`overflow`・box-shadow・角丸の扱いに注意）
- “リンクであること” の強調色は `--preview-link` に寄せ、装飾用アクセントと意味を混ぜない（AP-C2回避）

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- Markup（`src/ui/demo/views/palette-preview.ts`）
  - Facilities 生成要素を `div` → `a` に変更（`href` を持つ）
  - 構造を「リンク（縦並び）→ 正方形ボックス（border+icon）＋ ラベル（下）」へ
  - ラベルを行政カテゴリの空想コンテンツへ更新（例：子育て・教育 / 戸籍・家族 / 健康・医療 / 住まい・引っ越し / 妊娠・出産 / 申請・認証）
  - SVGは `currentColor` 運用に寄せ、色はCSS（リンク色）で統一しやすくする
- CSS（`src/ui/styles/components.css`）
  - `.preview-facilities__grid` の列数/ギャップを image-v6 に寄せる
  - タイル用のクラスで正方形タイル（角丸/ボーダー/余白）を定義
  - 状態設計：
    - hover（`@media (hover:hover)`）：ボーダー/背景/ラベルで「押せる」を補強
    - focus-visible：DADSの視認性を維持（見切れなし）
    - visited：グリッド導線は見た目を大きく変えない

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.test.ts` に Facilities の簡易構造テストを追加/更新（リンク件数・必須クラス等）

## 受入基準
- [ ] Facilities の各タイルがリンクとして操作できる（`a` 要素、タップ領域十分）
- [ ] 見た目が image-v6 の「正方形ボックス＋ラベル下」構造に寄っている
- [ ] hover/focus-visible が一貫し、focusが見切れない
- [ ] リンク色/アクセント色の役割が混ざっていない（AP-C2回避）
- [ ] レスポンシブで列数・余白が破綻しない
- [ ] 行政の空想コンテンツの文言になっている
- [ ] `bun test` がパスする

## リスク / エッジケース
- `a` の下線/visited表現が強く出て、タイルの見た目が崩れる（CSSで抑制が必要）
- タイル間が詰まると focus ring が見えにくい（gap/box-shadow調整が必要）
- 色の統一（`--preview-link`）を強くしすぎると主張が過多になる（mix率で調整）

## 作業項目（Action items）
1. ターゲット仕様（タイル構造/列数/状態）を確定（完了条件: image-v6に合わせた仕様が決まる）
2. `src/ui/demo/views/palette-preview.ts` のカテゴリ文言と `href` を決定（完了条件: 全アイテムがリンクとして定義される）
3. `src/ui/demo/views/palette-preview.ts` のFacilities DOM生成をリンクタイル構造へ変更（完了条件: DOM上でタイルリンクが生成される）
4. `src/ui/styles/components.css` にタイルCSSを追加し現行 Facilities スタイルを置換（完了条件: 正方形ボックス＋ラベル下になる）
5. hover/focus-visible/visited の状態を調整（完了条件: “押せる” が明確でフォーカスが見切れない）
6. ブレークポイントで列数/gapを調整（完了条件: 主要幅で破綻なし）
7. `src/ui/demo/views/palette-preview.test.ts` にFacilitiesの簡易テスト追加/更新（完了条件: マークアップ要件が担保される）
8. `bun test` で確認（完了条件: 全テストパス）

## テスト計画
- 自動: `bun test`
- 目視: hover/focus、キーボードTab移動、主要ブレークポイントでの列数/ラベル折返し

## オープンクエスチョン
- 該当なし

