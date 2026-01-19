# Opusレビュー（Studioビュー）取り込みメモ

Date: 2026-01-17

## Source
- `.context/attachments/pasted_text_2026-01-17_16-37-13.txt`

## Opusの観察（要約）
- Studioビューが存在し、プレビュー中心で確認できる。
- GenerateでPrimary/Accentが更新される。
- Primaryクリックでキーカラー入力へ誘導され、カラーピッカーで編集できる。
- 生成/パレット/シェード/アクセシビリティは機能として充実、特にアクセシビリティはHuemintより強い。

## 指摘事項（Opus）
- 色ロックがない / プリセットがない
- Presetsのドロップダウンが開かない可能性
- カラーバーが情報過多
- Copy code / URL share など探索UXが弱い
- Creativity / Model選択（※ただし本プロジェクトではAI機能は不要）

## 現状との差分（実装済み/誤認になり得る点）
- ロックとプリセットは実装済み（`studio-view.ts`）。
  - ただし現状ロックUIは5色に出ているが、再生成ロジックで実際に参照しているのはPrimary/Accentのみ。
    - Error/Success/WarningはDADS固定のため「ロックが効く/効かない」がUX上のノイズになり得る。

## 改善プラン（優先順）
### P0: ロックUIの整合
- Primary/Accent以外のロックは非表示にするか、常にロック（disabled）として表示し説明を付ける。

### P0: Presets UIの信頼性（Opusが「開かない」問題）
- ネイティブ`<select>`が環境/自動操作で開かないケースを想定し、Huemint風のpopoverメニューに置換（`aria-expanded`/キーボード対応）。

### P1: Copy code
- 各スウォッチに「コピー」ボタン（または右クリック/メニュー）＋トースト通知。

### P1: URL share
- 現在状態をURL hashへエンコード（primaryHex/custom, accentTokenId(or hex), bg, preset, locked）。
- `Copy Link`ボタンを追加。

### P2: “Creativity”相当（AIなし）
- スライダーで「候補の選び方」を調整（例: Accentの抽選母集団TopNを 5→50 に変更、重みの揺らぎ）。
- AIモデル選択は実装しない（要件）。

### P2: 情報密度の整理
- ツールバーは「色 + ロック」中心にし、WCAGバッジはホバー/詳細パネルへ退避する等。

