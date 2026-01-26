# CVD混同リスクの判定しきい値を 3.5 / 5.0 で切替できるようにする（バッジ連動）

Date: 2026-01-25
Branch: `monoharada/cvd-snap-kbest`

## 目標

- Studio要約の “CVD混同リスク N件” と右ドロワーのバッジ件数を、判定しきい値 **3.5 または 5.0** のどちらかで数える
- UI上のスイッチで **3.5 ⇄ 5.0** を切り替え、要約・バッジ・アクセシビリティビューが同じ設定で連動する
- 表示は「3.5か5.0か、どちらか一方」でよい（同時併記はしない）

## 背景

- 現状のCVD混同判定は `DISTINGUISHABILITY_THRESHOLD = 5.0`（ΔEOK=OKLab距離×100）を基準にしており、件数が多く出やすい
- 運用上は「強い混同に絞って見たい」ケースがある一方、5.0基準も必要に応じて参照したい
- そのため「判定しきい値」をUIで切り替えられるようにし、バッジも同一基準で表示する

## スコープ

- やること：
  - CVD混同判定（`detectCvdConfusionPairs`）に閾値パラメータを導入する
  - Demoの状態（state）に CVD混同の判定しきい値（3.5/5.0）を保持し、UIスイッチで変更できるようにする
  - Studio要約 / 右ドロワーバッジ / アクセシビリティビューの表示・計算をその値に揃える
  - （任意）localStorageに保存してリロード後も維持する
- やらないこと：
  - CVDシミュレーション方式、ΔE計算式そのものの変更
  - 依存追加や大規模なUI刷新
  - 「同時に両方の基準を出す」仕様（今回は不要）

## 前提 / 制約

- “CVD混同リスク N件” は「色ペア×CVDタイプ」の件数（既存仕様は維持）
- しきい値は ΔEOK（OKLab距離×100スケール）で、対象値は **3.5 / 5.0 の2択**
- UI上は「現在どちらのしきい値で数えているか」が分かる文言（例: `ΔE<3.5`）を必ず出す
- 生成アルゴリズム（Studioの候補選択・最適化）には、まずはこの切替を波及させない（再現性/意図せぬ生成変化のリスク回避）

## 変更内容（案）

### データ / バックエンド

- `src/ui/accessibility/cvd-detection.ts`
  - `detectCvdConfusionPairs(colors, options?)` の形で threshold（3.5/5.0）を受け取れるようにする
  - options未指定時は従来どおり 5.0 を使う（互換性維持）
- `src/ui/demo/types.ts` / `src/ui/demo/constants.ts`
  - `state` に `cvdConfusionThreshold: 3.5 | 5.0` を追加し、デフォルトは 3.5 にする
- `src/ui/demo/state.ts`（任意）
  - localStorage 永続化（load/persist）を追加する
- `src/ui/demo/index.ts`
  - 初期化時に永続化値を読み込み、UIスイッチ初期状態に反映する

### UI / UX

- `index.html`
  - ヘッダーに「混同判定」スイッチ（3.5/5.0）を追加する（閉域にしない）
- `src/ui/demo/index.ts`（または適切なUI制御モジュール）
  - スイッチ操作で `state.cvdConfusionThreshold` を更新し、再レンダリング・バッジ更新を行う
- `src/ui/demo/views/studio-view.ts`
  - 要約表示の件数は `state.cvdConfusionThreshold` を用いて計算し、ラベルに `ΔE<...` を表示する
- `src/ui/demo/a11y-drawer.ts`
  - バッジの件数は `state.cvdConfusionThreshold` を用いて計算する
- `src/ui/demo/views/accessibility-view.ts`
  - CVD混同リスト/件数は `state.cvdConfusionThreshold` を用いて計算する

### その他（Docs/Marketing/Infra など）

- 該当なし（必要ならUIの注記のみ）

## 受入基準

- [ ] スイッチで 3.5 / 5.0 を切り替えると、Studio要約の件数がその基準で計算される
- [ ] 同じ切替で、右ドロワーのバッジ件数も連動して変わる
- [ ] アクセシビリティビューのCVD混同リスト/件数も同じ基準で変わる
- [ ] 現在の基準（3.5 or 5.0）がUI上で明示される（数値が見える）
- [ ] `bun test` が通る
- [ ] `bun run build` が通る

## リスク / エッジケース

- 閾値切替でリスト内容が大きく変わるため、「減った＝改善した」と誤解する可能性 → ラベルに `ΔE<...` を必ず入れる
- `detectCvdConfusionPairs` は“通常視ゲート”にも関係するため、件数が単調に変化しない可能性 → 変更は「基準の切替」として扱う
- 生成ロジックに閾値を波及させると同一seedの再現性が変わる可能性 → 今回は表示側のみを切替対象に限定

## 作業項目（Action items）

1. stateに `cvdConfusionThreshold` を追加（完了条件: DEFAULT_STATE/型/リセットが整合）
2. `detectCvdConfusionPairs` を閾値指定可能にする（完了条件: options未指定=5.0、指定時=指定値で判定）
3. ヘッダーにスイッチUIを追加し、切替で再レンダリング（完了条件: クリックで要約/バッジ/リストが連動）
4. Studio要約を新閾値で計算＆表示（完了条件: `ΔE<...` が出て件数が切替で変化）
5. `updateA11yIssueBadge()` を新閾値で計算（完了条件: バッジが切替で連動）
6. アクセシビリティビューのCVD混同表示を新閾値に連動（完了条件: 件数/リストが切替で変化）
7. （任意）閾値の永続化（完了条件: リロード後も設定が維持される）
8. テスト更新（完了条件: `bun test` がパス）
9. ビルド確認（完了条件: `bun run build` がパス）

## テスト計画

- `bun test`
- `bun run build`
- （任意）`scripts/analyze-studio-cvd-confusion.ts` を 3.5/5.0 で実行し、分布が切替に応じて変わることを確認

## オープンクエスチョン

- 該当なし

