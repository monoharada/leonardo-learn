# ヘッダーの色覚特性（CVD）ボタンが「生成」「パレット」で効かない：原因と修正プラン

## 症状

- ヘッダーの「色覚（CVD）」ボタン（通常/P型/D型/T型/全色盲）を切り替えても、
  - 「生成（harmony）」ビュー
  - 「パレット」ビュー
 で表示が変わらない。
- 一方で「シェード」ビューはCVD切替が反映される（= ボタン自体や状態管理は動いている可能性が高い）。

## 現状の実装フロー（関係箇所）

- UI（ヘッダー）
  - `index.html` に `#cvdTypeButtons button[data-cvd]` がある。
- イベント登録
  - `src/ui/demo/index.ts` が `setupCVDControls(document.querySelectorAll("#cvdTypeButtons button"), ...)` を実行し、
    クリックで `state.cvdSimulation` を更新→ `renderMain()` を呼ぶ。
- 状態更新
  - `src/ui/demo/cvd-controls.ts` の `setupCVDControls()` が `state.cvdSimulation` を更新している。
- 表示側（各ビュー）
  - `src/ui/demo/views/shades-view.ts` は `simulateCVD` を使ってスウォッチ表示色を変換している。
  - `src/ui/demo/views/palette-view.ts` は **CVD変換を一切していない**（CUD strict のスナップのみ）。
  - `src/ui/demo/views/harmony-view.ts` は **CVD変換を一切していない**（カードプレビュー/Coolors表示ともに生HEXを渡している）。

## 原因（結論）

- ヘッダーの色覚ボタンは `state.cvdSimulation` を更新して `renderMain()` まで呼んでいるため、**状態管理とイベント自体は成立している**。
- ただし「生成（harmony）」と「パレット」ビューは、描画時に `state.cvdSimulation` を参照しておらず、**表示用の色をCVDシミュレーションで変換していない**ため、見た目が変わらない。

## 目標（期待挙動）

- ヘッダーのCVDボタン切替で、少なくとも以下がCVD表示に切り替わること
  - 生成（harmony）ビュー：カードプレビュー、Coolors表示、詳細選択の候補スウォッチ、サイドバーのミニプレビュー
  - パレットビュー：プレビュー（擬似サイト）、トークンテーブルのスウォッチ
- エクスポート値や内部のパレット値（生成結果そのもの）は変えず、**表示のみCVD変換**にする（副作用を避ける）

## 修正方針（設計）

- **単一ソースは常に元のHEX**（stateや生成ロジック、エクスポート対象のデータは変更しない）
- UIで色を「塗る直前」にだけ、`state.cvdSimulation` に応じた **表示用HEX** を作る
- クリックなどでモーダルへ渡す値は「元のHEX」を維持（色詳細やコピーが壊れないようにする）
- 変換の計算コストを抑えるため、`(hex, cvdType)` でメモ化（キャッシュ）する

## 具体的な修正タスク

### 1) 共通ヘルパーの用意（表示用HEX生成）

- `hex` + `state.cvdSimulation` から表示HEXを返す関数を追加
  - `"normal"` の場合はそのまま返す
  - それ以外は `new Color(hex)` → `simulateCVD(color, type)` → `.toHex()`（など）でHEX化
  - `(hex, type)` の結果はMapでキャッシュ

### 2) 生成（harmony）ビューの対応

- カードモードのプレビュー
  - `card.setPreviewColors([brandColor, ...accentColors])` に渡す配列を「表示用HEX」に置換
- Coolorsモード
  - `createCoolorsPaletteDisplay()` を「表示用の背景色」と「クリック時に渡す元色」を分離できるAPIに変更し、表示だけCVD変換する
  - サイドバー（`createHarmonySidebar`）に渡す `previews: Map<HarmonyFilterType, string[]>` を表示用に変換したMapに置き換え
- 詳細選択（候補グリッド）
  - `AccentCandidateGrid` に「スウォッチ表示色の変換関数（またはdisplayHex）」を渡せるようにし、候補のHEXは保持したまま塗りだけ変える

### 3) パレットビューの対応

- 擬似サイト（プレビュー）
  - `createPalettePreview(previewColors)` に渡す `previewColors` を表示用にCVD変換したものにする（背景やテキスト色計算との整合を確認）
- トークンテーブル
  - `TokenTableRow.hex` は元HEX（現状の挙動を維持）
  - `TokenTableRow.colorSwatch` だけ表示用HEXに差し替える
- CUD strict との順序
  - 既存の表示ロジック（strict時のスナップ）を崩さないよう、**「スナップ後にCVD変換」**の順で表示色を作る

### 4) テスト（最低限）

- `src/ui/components/coolors-palette-display.test.ts`
  - 表示用色とクリックで渡る色が分離されていること
- `src/ui/accent-selector/accent-candidate-grid.test.ts`
  - 表示用色が変換されても、選択/コールバックに渡る候補は元データのままなこと
- 必要に応じて `palette-view` / `harmony-view` の単体テストは「文字列/依存確認」中心の既存スタイルに合わせて追加

## 影響範囲（変更候補ファイル）

- `src/ui/demo/views/harmony-view.ts`
- `src/ui/demo/views/palette-view.ts`
- `src/ui/components/coolors-palette-display.ts`
- `src/ui/accent-selector/accent-candidate-grid.ts`
- （共通ヘルパー追加先：`src/ui/demo/cvd-controls.ts` か `src/ui/demo/utils` など）

## 受け入れ条件（Doneの定義）

- 「生成」「パレット」ビューでヘッダーCVDボタン切替が視覚的に反映される
- 色の詳細表示/コピー/エクスポートなど、元データに依存する挙動が変わらない
- シェードビューの既存挙動を壊さない

