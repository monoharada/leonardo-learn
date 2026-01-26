# Studioランダム生成でCVD混同（色覚特性エラー）が増える：スナップ（丸め）調査と低減プラン

Date: 2026-01-25
Branch: `monoharada/color-rounding-bug`

## 目標
- 「近い色同士に丸められているか？」をコード上の根拠つきで明確化する
- ランダム生成時のCVD混同増加の主要因を切り分ける
- （必要なら）生成ロジックを最小変更でCVD混同が起きにくい方向へ改善する

## 背景
- Studioのランダム生成は `src/ui/demo/views/studio-view.ts` の `generateNewStudioPalette()` が中心。
  - Primary: `selectRandomPrimaryFromDads()`（DADS chromaticから選択、preset/contrastでフィルタ）
  - Accent: `STUDIO_HARMONY_TYPES` からハーモニー種別をランダム選択し、分岐
    - `HarmonyType.NONE` の場合: `generateCandidates()`（`src/core/accent/accent-candidate-service.ts`）上位候補からランダム抽出
    - `HarmonyType.NONE` 以外の場合: `selectHarmonyAccentCandidates()` → `generateHarmonyPalette()` の計算結果を **`snapToNearestDadsToken()` で最寄りDADSトークンにスナップ（=丸め）**
- 丸め（スナップ）が存在する箇所は少なくとも2系統ある
  - DADSトークンスナップ: `src/ui/demo/utils/dads-snap.ts` の `snapToNearestDadsToken()`（OKLab ΔE最小のトークンへマッピング）
  - CUD strictスナップ: `src/core/cud/snapper.ts` の `snapToCudColor()` / `snapPaletteUnique()`（20色のCUD推奨色へマッピング）
    - ただし現状のデモUIにはCUDモード切替が露出しておらず、今回の調査対象はまずDADSスナップと候補抽出に寄せる
- 「色覚特性エラー（CVD混同）」は `src/ui/accessibility/cvd-detection.ts` の `detectCvdConfusionPairs()` で検出される
  - 1ペア×1CVDタイプごとに1件（= ペア数×タイプ数で件数が増えうる）
  - Studio要約は Primary/Accent に加えて Success/Warning/Error（セマンティック）も含めてカウント（`src/ui/demo/views/studio-view.ts`）
  - 右ドロワーのバッジは `state.palettes` を対象（`src/ui/demo/a11y-drawer.ts` の `updateA11yIssueBadge()`）

## スコープ
- やること：
  - ランダム生成経路ごとの「スナップ（丸め）有無」と「CVD混同増加」を定量化する（NONE vs harmony系、必要ならCUD strict有無）
  - （必要なら）Studioの生成ロジックに「CVD混同が少ない候補を選ぶ」最小限の選択戦略を追加する
  - 表示上の誤解があれば（例: “件数”の意味）、UI文言を最小修正する
- やらないこと：
  - CVD検出ロジック（閾値/式）の変更（合意なしでは触らない）
  - 依存追加や大規模な設計変更
  - 生成アルゴリズム全面改修（最小差分に留める）

## 前提 / 制約
- Studio要約の “CVD混同リスク N件” と、右ドロワーのバッジの増加が観測対象（ユーザー回答）
- 「CVD混同 〇件」は“色ペア×CVDタイプ”の件数で、色数が増えるほど自然に増えやすい

## 変更内容（案）
### データ / バックエンド
- Studio生成候補（Primary/Accents/必要ならSemantic含む）に対して `detectCvdConfusionPairs()` を評価関数として使い、「混同件数が少ない候補」を選ぶ
  - 例: 同一 `studioSeed` から導出した別seedで最大N回（例: 8〜12回）生成 → 最小件数の候補を採用（0件なら早期終了）
  - harmony系（`snapToNearestDadsToken()`）でスナップにより候補が寄る場合は、（必要なら）「近傍トークン（第2/第3候補）」も探索できるようにする
- “増えた”の切り分け用に、`HarmonyType.NONE` 経路と harmony経路で統計を取れる検証コード（スクリプト or テスト）を追加する

### UI / UX
- Studio要約の「CVD混同リスク（…色のペア）: N件」が
  - “ペア×CVDタイプ”の件数であること
  - セマンティック色も含めていること
  を短い注記で明示（必要なら）

### その他（Docs/Marketing/Infra など）
- 開発者向けに「どこでスナップ（丸め）が起きるか（DADS/CUD）」と「CVD件数の数え方」を短くドキュメント化（既存docs配下に追記）

## 受入基準
- [ ] 「丸め（スナップ）」が発生する経路（DADS/CUD）と呼び出し箇所がドキュメント化されている
- [ ] `HarmonyType.NONE` と harmony系で、CVD混同件数がどう変わるかを再現できる検証（自動）がある
- [ ] Studioのランダム生成で、同一seed条件におけるCVD混同件数の平均/ワーストが現状より改善する（改善指標は検証結果に基づき合意）
- [ ] 生成体験（速度/決定性/共有リンクの再現性）を著しく損なわない

## リスク / エッジケース
- セマンティック（赤/緑等）由来の混同はゼロ化が難しく、“0件”を目標にすると破綻しうる（「増分最小化」などの目標設計が必要）
- リトライ回数を増やしすぎると生成が重くなる
- 同一 `studioSeed` の出力が変わると共有リンク再現性の期待と衝突する可能性（要件整理が必要）
- スナップ（丸め）回避を強めると、DADSらしさ/ハーモニーらしさが弱まる可能性

## 作業項目（Action items）
1. Planを保存（完了条件: 本ファイルが `.codex/plans/` に存在）
2. 現状整理（生成経路/スナップ箇所/CVD件数算出）を短く文書化（完了条件: 主要ファイルと関数名が一覧化されている）
3. 検証用の自動化（seed固定でN回生成→CVD件数集計、経路別比較）を追加（完了条件: 再現可能な集計出力が得られる）
4. “増えた”の要因を切り分け（semantic含有/経路分岐/スナップ影響）し、改善ターゲットを決定（完了条件: 主要因が1〜2個に絞られる）
5. Studio生成に「候補を複数作って最小CVD件数を採用」戦略を実装（完了条件: 既存UI操作で挙動が確認できる）
6. 必要なら harmony系の `snapToNearestDadsToken()` を近傍探索に拡張（完了条件: スナップ起因の“寄り”が改善するケースがある）
7. 文言/注記の最小修正（誤解が原因なら）を反映（完了条件: “件数”の意味が読み取れる）
8. 関連テスト更新（完了条件: `bun test` が通る）

## テスト計画
- `bun test`
- 追加した検証（seed固定の集計）が安定して同じ結果を出すこと
- Studioで「生成」連打時の体感速度が劣化していないこと（簡易手動確認）

## オープンクエスチョン
- CUD対応モード（soft/strict）を現状使っているか（UI露出が見当たらないため、必要なら再確認）

