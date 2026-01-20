# Studio UX改善: Preset/Copy/Share/Contrast（統合Plan）

Date: 2026-01-19
Branch: monoharada/studio-ux-toolbar
Status: Approved (User: "APPROVE PLAN")

## 目標
- Studioの「プリセット」「ロック」「コピー」「共有」「エクスポート」の導線を短くし、初見でも迷いにくくする。
- ツールバーの情報密度を下げ、色選択/編集の主線を途切れさせない。
- 既存のDADS制約と既存Exportダイアログ互換を維持したままUXだけ改善する。

## 背景
- Studioは `src/ui/demo/views/studio-view.ts` に集約され、プリセットがネイティブ`<select>`、コントラストバッジが常時表示、HEXコピー/URL共有が未実装。
- 既存Plan `.codex/plans/2026-01-17-studio-ux-improvement-v2.md` / `.codex/plans/2026-01-17-opus-review-studio.md` と現状実装を照合し、未実装/改善余地のあるP0/P1を統合して実装する。

## スコープ
- やること：
  - Preset UIを`<select>`に依存しないUI（`<details>`メニュー等）へ置換し、キーボード操作を担保する。
  - スウォッチ行にHEXコピーを追加し、コピー成功/失敗のフィードバックを表示する。
  - Studio状態のURL共有（hashエンコード）+ `Copy Link` を追加し、リンクを開くと状態に復元できるようにする。
  - コントラストバッジの表示ルールを整理（Failは常時、AA/AAAはhover/focus等で表示）して情報密度を下げる。
  - 「生成（タブ）」とStudio内ボタンの概念競合を軽減するため、ラベル/文言を調整する。
  - Studio内のExport導線を明確化（CSS/Tailwind/JSONがあることをクリック前に見せる）。
- やらないこと：
  - AI/モデル選択やCreativity等の新機能（P2相当）。
  - 生成ロジックの全面刷新（DADS制約は維持）。
  - Studio以外の大規模リライト。

## 前提 / 制約
- UIは素のDOM生成（現状の `studio-view.ts` 流儀）を維持し、外部UI依存は増やさない。
- `navigator.clipboard` が使えない/拒否された環境でも破綻しない（失敗時はUIで通知、処理は継続）。
- URL hash は「名前空間付き」で実装し、将来の拡張を壊さない（例: `#studio=<payload>`）。
- 既存のExportモーダル（`index.html` / `src/ui/demo/export-handlers.ts`）は維持し、互換を壊さない。
- Shareリンクは「アクセントHEX（最大3色）まで実値で含めて完全復元」する。

## 変更内容（案）
### データ / バックエンド
- 該当なし（フロントのみ）。
- 共有用にStudio状態のシリアライズ/デシリアライズユーティリティを追加（URL hash）。

### UI / UX
- Preset: `<select class="studio-preset-select">` を廃止し、ボタン+メニュー（または `<details><summary>`）で選べるUIに変更。
- Swatches: 各行に `Copy` ボタンを追加し、クリックで元のHEXをコピー。コントラストバッジはFailのみ常時表示、AA/AAAはhover/focus-within で表示。
- Share: Studioツールバーに `Copy Link` を追加し、現在状態をURL hashへエンコードしてコピー。起動時にhashを読んで復元し、Studioを初期表示に切替。
- Export: Studio上でCSS/Tailwind/JSONの存在がクリック前に分かるUIにする（既存Exportモーダルも引き続き利用可能）。
- Terminology: Studio内のボタン/文言を調整して概念競合を弱める。

### その他（Docs/Marketing/Infra など）
- 該当なし

## 受入基準
- [ ] Studioのプリセットが、`<select>` に依存せず確実に操作できる（マウス/キーボード）。
- [ ] Studioの各スウォッチでHEXをコピーでき、成功/失敗が分かる（例: 2秒で文言が戻る）。
- [ ] `Copy Link` のURLを別タブで開くとStudioが開き、主要状態（Primary/Accent数/プリセット/ロック/KV seed等）が復元される。
- [ ] コントラストバッジはFailのみ常時可視で、AA/AAAはhover/focus等で確認できる。
- [ ] StudioからExportで「CSS/Tailwind/JSON」があることがクリック前に分かる。
- [ ] `bun test` / `bun run type-check` がパスする。

## リスク / エッジケース
- URL hash互換性: 不正/旧形式のhashでクラッシュしない（無視してデフォルトへ）。
- Clipboard API: `navigator.clipboard` が使えない/拒否のケースでUIが固まらない。
- メニューUIのアクセシビリティ: フォーカス移動/外側クリック/Escapeで閉じる等の抜け漏れ。
- CVDシミュレーション: 表示色（シミュレーション）とコピー対象（元HEX）の差が混乱要因になり得るため、ツールチップ等で明示。

## 作業項目（Action items）
1. Studio共有のシリアライズ仕様を確定し、`encode/decode` ユーティリティを追加（完了条件: 不正入力でも例外なく `null`/fallback になる）
2. `runDemo()` 起動時にhash復元を実装（完了条件: hash付きURLで起動してもレンダリングが崩れない）
3. Studioツールバーに `Copy Link` を追加（完了条件: クリックでURLがコピーされ、短いフィードバックが出る）
4. Preset UIを `<select>` からメニュー式に置換（完了条件: 開閉と選択がキーボードで可能で、`state.activePreset` が更新される）
5. スウォッチ行にHEXコピーを追加（完了条件: Primary/Accent/Semanticでコピーでき、Fail以外のバッジはhover/focus時のみ表示）
6. StudioのExport導線を調整（完了条件: Studio上でCSS/Tailwind/JSONの存在が事前に分かり、既存Exportモーダルも動く）
7. ラベル調整を適用（完了条件: Studio内ボタンの文言がトップの「生成」と衝突しない）
8. テスト追加/更新（完了条件: share encode/decode等のユニットテストが追加され、`bun test` が通る）

## テスト計画
- `bun run type-check`
- `bun test`
- 手動（Studio）: プリセット/コピー/共有/Export/キーボード操作（Tab, Enter, Esc）を確認

## オープンクエスチョン
- なし（アクセントHEXは最大3色まで実値で含めて完全復元する）

