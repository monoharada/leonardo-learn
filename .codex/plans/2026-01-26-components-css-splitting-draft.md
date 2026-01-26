# `src/ui/styles/components.css` 分割 Plan（ドラフト）

## 目標
- `src/ui/styles/components.css`（約 5,692 行）を分割し、責務ごとに追いやすくする
- **見た目/クラス名/セレクタ/カスケード順を変えず**に、差分を最小にする
- ビルド成果物 `dist/styles/index.css` の出力順を担保し、退行を防ぐ

## 現状観察（ざっくり）
- ファイル内は `/* ============================================ */` の見出しで“コンポーネント単位”に分かれている（`@layer` は未使用）
- `bun run build:css` が `tokens.css + components.css` を concat して `dist/styles/index.css` を生成している

## 分割方針（推奨）
### 方針A（推奨・安全寄り）
- `src/ui/styles/components/` を新設し、見出し単位で `*.css` に機械的に切り出す
- **順序は“元ファイルの並び”を厳密に維持**する（ここが最重要）
- `build:css` を「決め打ちの順序リスト」で concat するように変更し、`dist/styles/index.css` を生成する

### 方針B（将来案）
- 方針Aに加えて `@layer`（例: `@layer dads, demo, overrides;`）へ段階導入し、上書きの意図を明確化する
- ただし導入コストと副作用（順序/特異性の再確認）があるため、まずはAで安全に分割

## 具体タスク（次フェーズ）
1. **現状の出力を固定化**
   - `bun run build` 実行後の `dist/styles/index.css` をハッシュ化（回帰比較の基準）
2. **分割の粒度を確定**
   - 既存の見出し境界をベースに、1ファイルあたり 200〜600 行を目標（例外は許容）
3. **`src/ui/styles/components/` を作成し、機械的に切り出し**
   - 例: `00-button.css`, `01-badge.css`, `02-input.css`, …（番号は“順序固定”のため）
4. **ビルド手順を更新**
   - `build:css` を `tokens.css + components/*.css（決め打ち順）` の concat に変更
   - `src/ui/styles/components.css` は互換目的で残す（`components/` を参照する薄いファイル or 生成物扱い）
5. **検証**
   - `bun run build` が通る
   - `dist/styles/index.css` のハッシュ一致（または差分が“分割に伴う改行/空白のみ”であること）
   - 主要画面の目視（Palette/Studio/Manual/A11y/Modal）

## リスク / 注意点
- **concat 順序がズレると即退行**（特異性が同等なセレクタが多いほど危険）
- `url(...)` 等の相対参照がある場合、ファイル移動でパスが壊れる（要 grep）
- “デモ画面専用の上書き”が混在している場合、切り出し先の分類を誤ると読みづらさが残る

## 受入基準
- `src/ui/styles/components.css` が分割され、責務別の複数ファイルになっている
- `bun test` / `bun run type-check` / `bun run lint` / `bun run build` が通る
- `dist/styles/index.css` のカスケード順が維持され、主要画面に明確な退行がない

