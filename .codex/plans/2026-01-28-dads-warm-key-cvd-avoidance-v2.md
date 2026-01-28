# DADS暖色キー（Primary/Secondary/Tertiary）のCVD混同回避（orange-600等）v2

ランダム要素自体は難しくないです。ただし「完全にランダム」にすると再現性がなくなってテストが不安定になるので、**seed（例: `state.studioSeed` / URLに含まれるseed）に基づく擬似ランダム**にすると「1000の時もあれば1100の時もある」を実現しつつ、同じseedなら結果が固定できて運用しやすいです。

しきい値はご希望どおり、**キーカラー（Primary/Secondary/Tertiary）導出の混同回避は 5.0 固定**で進める前提に更新します。

## 目標
- DADSトークン由来の Primary/Secondary/Tertiary が、色覚特性（CVD）混同エラーを起こささない導出になること
- 例：Primary が `orange-600 (#fb5b01)` のとき、Secondary が `orange-500` を選ばず、DADSガイド例（`orange-600/orange-800/orange-1100`）に近い組み合わせを選べること
- **キーカラーの混同回避しきい値は 5.0 固定**（UI表示のトグルとは独立）

## 背景
- 現状のDADSモード導出は `src/core/key-color-derivation/deriver.ts` の `deriveFromDadsTokens()` が担っている。
- `orange-600`（白背景）だと、現状ロジック上 `Secondary=orange-500` になりうる（方向制約の都合）。
  - これが `Primary(orange-600)` と **CVD混同**になりやすく、UI上「色覚特性エラー」になる。
- 同様に `red-600` でも `Secondary=red-500` 側に寄って混同エラーになりうる。
- しきい値は **5.0 固定**（ユーザー決定）。

## スコープ
- やること：
  - DADSモード時の Secondary/Tertiary 選定を、**CVD混同回避（5.0）を満たすように**改善
  - `orange-600`/`red-600` の回帰テスト追加
  - Tertiary が候補複数ある場合に **seedベースで 1000/1100 を揺らす**（再現可能な擬似ランダム）
- やらないこと：
  - DADSトークン定義（`src/ui/styles/tokens.css` 等）の変更
  - アクセント生成ロジックやセマンティック色の仕様変更

## 前提 / 制約
- DADSモードでは `@step` とHEXの整合性が重要なので、導出結果は **DADSトークンのHEXをそのまま使う**（中間色生成でごまかさない）。
- 「ランダム」は **seed依存の擬似ランダム**にする（同じ入力＋同じseedで結果が再現できること）。
- しきい値 5.0 は「CVD混同」だけでなく、**通常視でも近すぎる組合せを避ける**判定にも使う（= normal ΔE も下回るならNG）。

## 変更内容（案）
### データ / バックエンド
- `deriveFromDadsTokens()` の Secondary/Tertiary 選定を「単発選び」ではなく、**候補ペアを評価して選ぶ**方式に変更する。
  - 候補は同一hue内のDADSステップ（50〜1200）から `primaryStep` を除外して作る
  - 制約（必須）：
    - Secondary: `contrast >= secondaryUiContrast`（基本 3.0）
    - Tertiary: `contrast >= tertiaryContrast`（基本 3.0）
    - 3色（Primary/Secondary/Tertiary）の全ペアで、**通常ΔE >= 5.0** かつ **全CVDタイプでΔE >= 5.0**
  - 目的関数（スコア）：
    - DADSの例に寄せた「目標ステップ」からの距離を小さく（例: `primary=600` なら `secondary≈800`, `tertiary≈1100` を優先）
    - 近接ステップ（差が100など）はペナルティ（ただし制約を満たすなら採用可）
  - 「Secondary/ Tertiary が反対方向」という従来方針は **“可能なら優先”**に落とす（`orange-600` のように片側にしか解がない場合は同方向を許容）。

- **擬似ランダム（ユーザー要望）**：
  - 同点/僅差で `tertiary=1000` と `1100` が両方OKな場合、`seed` でどちらかを選ぶ（例: seedのハッシュでindex決定）。
  - `seed` は Studio では `state.studioSeed` を渡す想定（URL復元時も同seedで再現）。

### UI / UX
- UI変更は不要（結果が変わるだけ）。
- 期待効果：`orange-600` 選択時に `Secondary=orange-500` が避けられ、A11yバッジのCVDエラーが解消される。

### その他（Docs/Marketing/Infra など）
- 必要なら `docs/` に「キーカラー導出はCVD閾値5.0固定」「Tertiaryはseedで揺らす」方針メモを追記。

## 受入基準
- [ ] Primary=`orange-600 (#fb5b01)`（白背景）で Secondary が `orange-500` にならない
- [ ] 上記で `Primary/Secondary/Tertiary` の全ペアが **通常ΔE>=5.0** かつ **全CVDタイプΔE>=5.0**
- [ ] `red-600` でも同様に `Primary-Secondary` の混同（5.0基準）が出ない
- [ ] `Light Blue 800 → Secondary 600 / Tertiary 1000` の既存テストが維持される
- [ ] 擬似ランダムは **seed固定で結果が固定**される（＝テストが安定する）
- [ ] `orange-600` の Tertiary は条件を満たす範囲で **1000/1100 のどちらも出現し得る**（seed差分で確認可能）

## リスク / エッジケース
- しきい値 5.0 にすると、色相によっては「近いステップ」が想像以上にNGになる（例: 緑系など）ため、二段飛ばし（600→800）寄りの結果が増える可能性。
- 擬似ランダム導入で、期待するステップが固定でなくなる（ただしseedで再現可能）。
- “反対方向”を必須から外すことで、既存の意図（明暗バリエーション確保）が変わる可能性（ただし制約ベースで最低限の区別性は担保）。

## 作業項目（Action items）
1. `orange-600` と `red-600` の現状再現（テストで固定）。（完了条件: 現行がNGになるケースを追加できる）
2. キーカラー用の ΔE/CVD 判定ユーティリティを用意（5.0固定）。（完了条件: 2色がOK/NG判定できる）
3. DADSモード導出を「候補ペア評価」に変更。（完了条件: `orange-600` が `secondary=800` 側に寄る）
4. seedベースの擬似ランダムで `tertiary=1000/1100` の揺らぎを導入。（完了条件: seed差分で結果が変わり得る＆seed固定で再現）
5. `Light Blue 800` 既存テストが通ることを確認。（完了条件: 既存テスト維持）
6. `orange/red` 新規テストで「混同ペア無し（5.0）」を検証。（完了条件: 回帰防止）
7. Studioで目視確認（A11yバッジ含む）。（完了条件: エラー解消を確認）

## テスト計画
- `src/core/key-color-derivation/deriver.test.ts` に
  - `orange-600` / `red-600` の DADSモードケース追加（5.0基準でOK）
  - seed固定時の再現性（同seed→同結果）と seed差分時の揺らぎ（結果が変わり得る）を検証
- `bun test` を通す

