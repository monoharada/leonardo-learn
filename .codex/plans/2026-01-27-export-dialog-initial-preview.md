# Export Dialog Initial Preview Auto-Populate

## Context
- `setupExportControls()` で `setupExportHandlers()` は呼ばれているが、`exportBtn: document.getElementById("export-btn")` はDOMに存在せず `null` になる。
- Studio/Manual の Export ボタン（`.studio-export-btn`）は各 view render 時に動的生成され、`onclick` で `exportDialog.showModal()` を直接呼ぶため、`updateExportPreview()` が走らず `#export-area` が初回オープン時に空になる。
- `syncModalOpenState()` も Export ダイアログの open 経路では呼ばれない。

## Scope
- やること：
  - Exportダイアログを開く導線を `setupExportHandlers()` 側で一元化し、開く直前にプレビュー生成を保証する。
  - Studio/Manual どちらから開いても同一挙動にする。
  - フォーマット切替・Copy/Download の既存挙動を維持する。
- やらないこと：
  - Export内容の仕様変更、エクスポートアルゴリズム変更、UI刷新。

## Proposed solution
1. `src/ui/demo/export-handlers.ts`
   - `exportDialog` が存在する限り、`close` イベントで `syncModalOpenState()` を呼ぶ（`exportBtn` の有無に依存させない）。
   - `document` にクリック委譲ハンドラを追加し、`.studio-export-btn` のクリックを検知したら `updateExportPreview()` → `exportDialog.showModal()` → `syncModalOpenState()` の順で実行する。
   - 重複登録を避けるため、委譲ハンドラはモジュール内で参照を保持して再セット時に remove できる形にする。
2. `src/ui/demo/views/studio-view.render.ts` / `src/ui/demo/views/manual-view.render.ts`
   - Export ボタンの `onclick` で `showModal()` を直接呼ぶ処理を削除（委譲ルートに統一して二重 `showModal()` リスクを避ける）。
   - ボタンの class（`.studio-export-btn`）は維持する。
3. テスト（必要なら）
   - `src/ui/demo/export-handlers.test.ts` に JSDOM を使った最小テストを追加し、`.studio-export-btn` クリックで `#export-area` が空でなくなることを確認（`showModal` はスタブ）。

## Risks / Edge cases
- クリック委譲の誤検知 → セレクタを `.studio-export-btn` のみに限定。
- 二重で `showModal()` が呼ばれる → views 側の直接 `showModal()` を削除して一元化。

## Action items
1. `export-handlers.ts` の open/close 経路を委譲化して `updateExportPreview()` を必ず実行
2. Studio/Manual の Export ボタンから直接 `showModal()` 呼び出しを削除
3. （任意）JSDOMのユニットテスト追加
4. `bun test` と手動確認（初回オープン時にCSSが表示されること、Studio/Manual両方）

