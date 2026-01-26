# PR差分コード簡素化（monoharada/e2e-failures）

## 目標
- このPR（`origin/main...monoharada/e2e-failures`）で分割されたUIデモ周りの差分を対象に、**挙動・見た目を変えずに**重複/冗長さを減らして読みやすくする。
- 特に「同じUI（共有リンク/エクスポート等）なのに実装が二重化している」「同じ条件分岐/フィルタが複数回書かれている」箇所を整理する。

## 背景
- 現状のPR差分は40ファイル規模で、巨大モジュール分割＋E2E修正が同居している（例：`manual-view`/`studio-view`/`palette-preview`/`accessibility-view`/`color-detail-modal`）。
- 分割後も、以下のような「差分の読みづらさ・重複」が残っている：
  - `manual-view` と `studio-view` で **共有リンクボタンのSVG/コピー処理/一時表示** が重複（実装も微妙に異なる）。
  - `src/ui/demo/utils/dads-snap.ts` の `selectHueDistantColors` で **似たfilterブロックが3回**あり、意図の把握が難しい。
  - `src/ui/demo/color-detail-modal/detail-sync.ts` の `createUpdateDetailHandler` が **DOM取得・更新処理の塊**になっており、分割後も読み取り負荷が高い。

## スコープ
- やること：
  - `src/ui/demo/**`（特に `views/*` と `utils/dads-snap.ts`、`color-detail-modal/detail-sync.ts`）を中心に、**挙動不変**で重複削減/関数分割/共通化を行う
  - 既存ユーティリティ（例：`src/ui/demo/utils/clipboard.ts`）を優先的に再利用する
  - `bun test` / `bun run type-check` / `bun run lint` を通す（可能なら `bun run test:e2e` も維持）
- やらないこと：
  - 仕様変更（生成結果・表示順・DOM構造・文言・CSSクラスの変更）
  - 依存追加、ロックファイル更新、大規模リネーム/再分割（今回の簡素化に不要な範囲）
  - `src/ui/styles/*` の設計変更

## 前提 / 制約
- 既存のexport/APIを維持する（例：`src/ui/demo/color-detail-modal.ts` の `openColorDetailModal` と `_testHelpers`、各viewの公開関数）。
- UI Layer内でも循環依存を作らない（特に `views` 間で重いモジュールを相互importしない）。
- Biome前提（タブインデント/ダブルクォート/organize imports）で、不要な全体整形はしない。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- 見た目・文言・操作結果は変更なし（ただし内部実装を統一して、挙動差が出ないように固定する）
  - 共有リンク: 成功/失敗メッセージと復帰タイミング、アイコン付き表示を両viewで一致させる（現状の表示仕様に合わせる）

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/manual-view.render.ts`
  - 共有リンクのコピー処理を `src/ui/demo/utils/clipboard.ts` に寄せ、例外処理/タイマー処理の重複を削減
- `src/ui/demo/views/studio-view.render.ts`
  - `manual-view` 側と重複している「共有リンクSVG」「エクスポートボタンHTML」を単一ソース化（共通constへ）
- `src/ui/demo/views/studio-view.core.ts`
  - `setTemporaryButtonText` を「Studio固有ロジック」から切り離し、軽量な共通ユーティリティへ移動（Studioの重量級依存をManualへ引っ張らないため）
- （新規 or 既存へ追加）`src/ui/demo/utils/*` または `src/ui/demo/views/*`
  - `LINK_ICON_SVG` / `EXPORT_BUTTON_CONTENT_HTML` / `setTemporaryButtonText` をまとめた軽量モジュールを追加し、Manual/Studioが参照
- `src/ui/demo/utils/dads-snap.ts`
  - `selectHueDistantColors` の3重filterを、共通predicate/段階フィルタで表現し直して重複削減（フォールバック順序・選択条件は維持）
- `src/ui/demo/color-detail-modal/detail-sync.ts`
  - `createUpdateDetailHandler` のDOM参照をキャッシュし、更新処理を小さな関数へ分割（同じDOM/属性更新を維持）

## 受入基準
- [ ] `openColorDetailModal` / `_testHelpers` を含む公開API（export名/型/利用側import）が維持されている
- [ ] Manual/Studio の共有リンク・エクスポートボタンが、表示/文言/復帰タイミング含めて**現状と同じ**に動く（連打時も破綻しない）
- [ ] `selectHueDistantColors` のフォールバック順序（コントラスト/色相距離/プリセット）と結果の性質が維持され、`src/ui/demo/utils/dads-snap.test.ts` がパスする
- [ ] `bun test` が通る
- [ ] `bun run type-check` が通る
- [ ] `bun run lint` が通る

## リスク / エッジケース
- 共有リンクの一時表示（タイマー）を共通化する際、ボタンHTML復帰（アイコン含む）や連打時の復帰タイミングが微妙に変わるリスク。
- `dads-snap.ts` のリファクタで、候補プール生成順やフィルタ適用順を誤ると「ランダム選択の分布」が変わり得る（テスト＋ロジックの同値性確認が必要）。
- `detail-sync.ts` のDOMキャッシュ化で、要素が差し替えられる前提があると参照が古くなるリスク（現状のDOM生成方式を確認してから適用）。

## 作業項目（Action items）
1. 対象ファイルを確定する（完了条件: 今回触るファイル一覧が10ファイル以内で固定できている）
2. 既存ユーティリティの再利用方針を決める（完了条件: `clipboard`/一時表示/アイコンをどこに集約するか決まっている）
3. 共有リンク/エクスポートの共通部品を用意する（完了条件: 軽量モジュールにconst/関数がまとまり、両viewから参照できる）
4. Manual の共有リンク処理を共通化する（完了条件: `manual-view.render.ts` から重複try/catch+timeoutが消え、挙動は同一）
5. Studio の共有リンク/エクスポート表現を共通化する（完了条件: `studio-view.render.ts` から重複SVG/HTMLが消え、表示は同一）
6. `dads-snap.ts` の `selectHueDistantColors` を重複排除で整理する（完了条件: 3重filterが解消し、テストが維持される）
7. `detail-sync.ts` の更新処理を分割・キャッシュ化する（完了条件: DOM取得の重複が減り、モーダル関連テストが維持される）
8. 検証を実行する（完了条件: `bun test`/`type-check`/`lint` が全てパスする）

## テスト計画
- 自動: `bun test`
- 型: `bun run type-check`
- 静的解析: `bun run lint`
- 可能なら回帰: `bun run test:e2e`（時間が厳しければ、PRで落ちた/重要なspecに絞って実行）

## オープンクエスチョン
該当なし

