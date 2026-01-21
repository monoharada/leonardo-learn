# Studio: Bottom Floating Toolbar（Studio限定）

Date: 2026-01-20  
Branch: monoharada/bottom-toolbar  
Status: Approved (User: "APPROVE PLAN")

## 目標
- Figmaのように画面下部に浮くツールバーを **Studioビュー限定** で実装する。
- ツールバーを **ランドマーク（region）** として提供し、アクセスしやすくする。
- ツールバー内に以下を配置する：
  - ジェネレート
  - ジェネレート一つ戻る（Undo）
  - 設定（アクセント色数 / ジェネレートプリセット）
  - 現在生成された色（キーカラー + アクセント全部）
  - 共有リンク（Copy Link）
  - エクスポート

## 背景
- 現状 `src/ui/demo/views/studio-view.ts` には `.studio-toolbar` があるが、下部固定ではなく、要件の「Settings集約」「Undo」「ランドマーク化」に未対応。
- 共有リンク（`#studio=<payload>`）は既存実装があるため、互換を壊さずに拡張する。

## スコープ
- やること：
  - Studioビュー専用の下部フローティングツールバーUIを実装
  - ツールバーをランドマーク化（`aria-label` 等）
  - Settingsメニューに「アクセント色数（3/4/5/6、デフォ4）」「プリセット」を集約
  - Undo（1つ戻る）を実装
  - 現在色（Primary + Accent全部）をツールバーに表示
  - Copy Link をツールバーに残す（共有リンクが必要）
  - Export導線をツールバーに配置
- やらないこと：
  - Studio以外のビュー変更
  - KVシャッフル / KV固定（ユーザー指示により不要）
  - 生成ロジックの大幅刷新

## 前提 / 制約
- ツールバーが `position: fixed` になるため、**コンテンツが隠れない余白確保**（safe-area含む）が必要。
- 共有リンクは既存の v1 を復元可能に保ちつつ、必要なら v2 を追加して拡張する。

## 変更内容（案）
### データ / バックエンド
- Studio専用のアクセント色数（3/4/5/6）を state に追加（他ビューの `accentCount: 1|2|3` とは分離）。
- Undo用に「直前スナップショット」を保持（まずはGenerate直前の状態のみを1つ戻す）。

### UI / UX
- ツールバーを下部フローティング化（中央寄せ/角丸/影/ボーダー）。
- ランドマーク化：`section` に `aria-label="スタジオツールバー"` などを付与。
- Settings内：
  - アクセント色数（3/4/5/6）
  - プリセット
- ツールバー表示色は **Primary + Accent 全部**（セマンティック色はツールバーの表示対象外）。
- Copy Link/Export は既存導線互換のまま配置換え。

### その他
- `studio-url-state` の decode を v1/v2 対応（不正payloadでもクラッシュしない）。
- 最低限のユニットテスト追加/更新。

## 受入基準
- [ ] Studioビューでツールバーが画面下部にフロートして表示される
- [ ] ツールバーがランドマーク/リージョンとして認識できる（ラベル付き）
- [ ] ツールバーに Generate / Undo / Settings / Current colors / Copy Link / Export が存在する
- [ ] Settingsからアクセント色数を3/4/5/6に変更でき、表示されるアクセント数も追従する
- [ ] Generate→Undoで直前の生成状態に戻る（戻せないときはdisabled）
- [ ] Copy Link を開くと Studio 状態が復元される（v1互換を維持）
- [ ] Export が既存のエクスポート動線を起動できる

## 作業項目（Action items）
1. state にStudio専用アクセント色数を追加（完了条件: default=4、resetで初期化される）
2. `studio-url-state` をv1互換のまま拡張（完了条件: v1リンクが復元できる）
3. StudioツールバーUIを下部fixed + Settings集約 + Undo追加（完了条件: 要件の操作が揃う）
4. 下部fixedに合わせて余白/レスポンシブ/メニュー表示を調整（完了条件: コンテンツが隠れない）
5. テスト更新と `bun test`（完了条件: テストが通る）

