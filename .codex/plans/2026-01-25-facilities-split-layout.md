# Facilities セクションを2カラム（左：本文 / 右：アイコングリッド）へ再構成（image-v7準拠）

Date: 2026-01-25
Source: `.context/attachments/image-v7.png`

## 目標
- `.context/attachments/image-v7.png` の構成どおり、**左に本文ブロック（見出し/テキスト）・右にFacilities見出し＋アイコングリッド** を並べる
- 右側のアイコンが **カテゴリへの遷移リンク** として明確に見える
- DADS準拠で `:focus-visible` が **見切れず** 一貫して見える

## 背景
- 現状の Facilities は単一カラム（見出し＋グリッド）で、image-v7 の「左に説明、右にグリッド」構成と一致していない。
- practical-ui-2nd-edition の観点では、**塊（グルーピング）** と **インタラクションの型（右だけリンク）** を明確にする必要がある。

## スコープ
- やること：
  - `src/ui/demo/views/palette-preview.ts` の Facilities セクションを **2カラムレイアウト** に変更（左本文＋右グリッド）
  - 左カラムに「行政の空想コンテンツ」（見出し/説明文）を追加
  - 右カラムに「Facilities」見出し＋カテゴリリンクタイル（既存タイルを流用）を配置
  - CSSで余白/整列/列数（PCは4列想定）を image-v7 に寄せる
  - テストを最小限更新し `bun test` を通す
- やらないこと：
  - 実際のルーティング実装（hrefの実装、遷移先の追加）
  - パレット生成/色計算ロジックの変更
  - 依存追加

## 前提 / 制約
- Facilities は「カテゴリへの遷移リンク」で確定（ユーザー合意）
- フォーカスリングをクリップしない（親の `overflow` や tight gap に注意）
- 右（リンク）と左（非リンク）の役割を混ぜない（AP-INT回避）
- 変更は Facilities セクション周辺に限定し、不要な整形は避ける

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- Markup（`src/ui/demo/views/palette-preview.ts`）
  - Facilities セクション内に左本文ブロックを追加
  - 右側に `Facilities` 見出し＋ `nav.preview-facilities__grid` を配置
- CSS（`src/ui/styles/components.css`）
  - `.preview-facilities` を2カラム（デスクトップ）/縦積み（モバイル）に変更
  - `.preview-facilities__grid` をPC 4列に調整（縮小で 3→2列）
  - 左本文のタイポグラフィと段落間隔を定義

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.test.ts` の Facilities DOM テストを新構造に合わせて更新

## 受入基準
- [ ] Facilities セクションが「左：本文 / 右：アイコングリッド」の2カラムになっている（image-v7の構成）
- [ ] 右側タイルがカテゴリ遷移リンクとして成立している（`a`、タップ領域十分）
- [ ] `:focus-visible` が見切れない（特にグリッド内）
- [ ] レスポンシブで崩れない（PC 2カラム → モバイル縦積み）
- [ ] 左側の文言が「行政の空想コンテンツ」になっている
- [ ] `bun test` がパスする

## リスク / エッジケース
- 2カラム化で右グリッドの横幅が縮み、ラベル折返しが過剰になる（→ tile幅/列数/文字サイズ調整）
- フォーカスリングが隣接タイルと干渉して読みにくい（→ gap/outline-offsetの見え方確認）

## 作業項目（Action items）
1. Planを保存（完了条件: `.codex/plans/` に日付付きmdが作成されている）
2. Facilities セクションのDOMを2カラムへ組み替え（完了条件: 左本文＋右見出し＋右グリッドが存在）
3. 2カラムCSSとレスポンシブを追加（完了条件: デスクトップ2カラム、モバイル縦積み）
4. 右グリッドの列数/余白を image-v7 に寄せる（完了条件: PCで4列に見える）
5. Facilities DOMテストを更新（完了条件: 新構造がテストで担保）
6. `bun test` 実行（完了条件: 全テストパス）

## テスト計画
- `bun test`
- 目視: Facilities の2カラム表示、レスポンシブ、Tabフォーカス、ラベル折返し

## オープンクエスチョン
- 該当なし

