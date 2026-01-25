# 手続きカテゴリ（カード型リンク）：リンク下線＋ホバーで下線を太く

## 目標
- 右カラムのカード型リンクで、リンクテキストに下線を付ける
- hover 時に下線が太くなる（DADSリンクの挙動に寄せる）
- 既存のカードホバー（枠＋アウトライン）と干渉しない

## 背景
- 現状の `.preview-list-item` はカード化のため `text-decoration: none` になっており、リンクらしさ（下線）が弱い。
- DADSのリンクは hover で `text-decoration-thickness` が増えるため、同じ空気感に揃えたい。

## スコープ
- やること：
  - `src/ui/styles/components.css` で `.preview-list-item__text` に下線（通常）を付与
  - hover 時に `.preview-list-item__text` の下線を太くする
- やらないこと：
  - 文字自体を太くする（フォントウェイト変更）
  - 左カードや2カラム構造の変更

## 前提 / 制約
- 下線はテキスト部分（`.preview-list-item__text`）のみ（矢印 `→` は下線なし）
- hover は `@media (hover: hover)` 内で変更（タッチ環境で暴れない）
- DADSの `:focus-visible` は既定のまま維持

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `.preview-list-item__text`
  - `text-decoration-line: underline`
  - `text-decoration-thickness: 0.0625rem`
  - `text-underline-offset: 0.1875rem`
- hover 時（`.preview-list-item.dads-link:hover .preview-list-item__text`）
  - `text-decoration-thickness: 0.1875rem`

### その他（Docs/Marketing/Infra など）
- 該当なし

## 受入基準
- [ ] 右リストのリンクテキストに下線が表示される（矢印には付かない）
- [ ] hover で下線が太くなる
- [ ] 既存のカードhover（枠＋アウトライン）と両立する
- [ ] `bun test` がパスする

## リスク / エッジケース
- 下線＋枠強調で情報量が増える（→下線はテキストのみ、太さ変化だけに留める）

## 作業項目（Action items）
1. `.preview-list-item__text` に下線を追加（完了条件: 通常時に下線が表示される）
2. hover 時の下線太さを追加（完了条件: hoverで太くなる）
3. `bun test` 実行（完了条件: 全テストパス）

## テスト計画
- `bun test`
- 目視: 通常/hover の下線、矢印に下線が付かないこと、フォーカス可視性

## オープンクエスチョン
- 該当なし

