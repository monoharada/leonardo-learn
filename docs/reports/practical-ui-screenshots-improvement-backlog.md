# Practical UI スクリーンショット改善：UIパターン & バックログ

## Inputs（参照）
- 評価レポート: `docs/reports/practical-ui-screenshots-eval.md`
- 評価プラン（手順/観点の出典）: `.codex/plans/2026-01-27-practical-ui-screenshots-eval.md`

本ドキュメントは上記の評価結果を「繰り返し使えるUIパターン」と「実装できる粒度のバックログ」に落とすための叩き台です。

## スクショ（ローカル）
- このワークスペースでは `.context/screenshots/*.png` に配置（gitignored）

| ID | File |
| --- | --- |
| 00 | `../../.context/screenshots/00-studio-view.png` |
| 01 | `../../.context/screenshots/01-manual-view.png` |
| 02 | `../../.context/screenshots/02-cvd-protanopia.png` |
| 03 | `../../.context/screenshots/03-a11y-drawer.png` |
| 04 | `../../.context/screenshots/04-swatch-popover.png` |
| 05 | `../../.context/screenshots/05-export-dialog.png` |
| 10 | `../../.context/screenshots/10-pastel-hero.png` |
| 11 | `../../.context/screenshots/11-pastel-branding.png` |
| 12 | `../../.context/screenshots/12-vibrant-hero.png` |
| 13 | `../../.context/screenshots/13-vibrant-branding.png` |
| 14 | `../../.context/screenshots/14-dark-hero.png` |
| 15 | `../../.context/screenshots/15-dark-branding.png` |
| 16 | `../../.context/screenshots/16-highcontrast-hero.png` |
| 17 | `../../.context/screenshots/17-default-pinpoint.png` |
| 18 | `../../.context/screenshots/18-default-branding.png` |

## 実装の当たり先（コードの入口）
> バックログを作業チケットにするとき、まずここから辿ると早い、という入口です。

- プレビュー（00, 10-18, 17）: `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css`
- Studio/Manual（00, 01, 04）: `src/ui/demo/views/studio-view.render.ts`, `src/ui/demo/views/manual-view.render.ts`, `src/ui/styles/app-components.css`
- a11y drawer（03）: `src/ui/demo/a11y-drawer.ts`, `src/ui/demo/views/accessibility-view.render.ts`, `src/ui/styles/components.css`, `src/ui/styles/app-components.css`
- Export dialog（05）: `index.html`, `src/ui/demo/export-handlers.ts`

---

## UIパターン（最小セット）

### P-01: 遷移リスト（Link list / 行全体クリック + 右矢印）
**狙い（AP-INT対策）**: “遷移”を“入力/選択”と誤認させない。

- 行は `a`（またはリンク相当）で**行全体をクリック可能**にする
- 右端に `→`（または矢印アイコン）を置き、**遷移の型**を固定する
- 「ラジオ風の丸」「入力欄っぽい枠/背景」を避ける（選択UIと混線しやすい）
- **現在地/状態**は「左バー + 太字 +（必要なら）アイコン」を基本にし、色は補助
- **focus-visible** が切れないこと（角丸 + `overflow: hidden` でクリップしない）

### P-02: 遷移タイル（Navigation tiles / カード遷移の型を固定）
**狙い（AP-INT/AP-H1対策）**: “タイル = 遷移”を一目で分かる形にする。

- タイルも基本は **行全体クリック + 右矢印**（カード版）で統一
- もし“選択”にしたい場合は、**タイルを選択UIに見せない**（別途ラジオ/チェック + 確定導線を用意）
- アクセント色は「リンク/CTA」優先。状態背景に多用しない（AP-C2抑制）

### P-03: ヒーローの階層（CTA主導権の固定）
**狙い（AP-H1対策）**: Branding で装飾がCTAと競合しない。

- どのテーマ（pastel/vibrant/dark/highcontrast）でも **CTAを最上位**に固定
- Branding（大きなビジュアル）は「装飾」へ格下げ（面積/コントラスト/情報量を抑える）
- 強調は1つだけ（CTA・見出し・装飾が同時に強くならない）

### P-04: 状態表現（色以外で成立させる）
**狙い（DADS優先）**: CVD/ランダムカラーでも状態が分かる。

- 状態は「位置/形/太字/アイコン」で成立させる（色だけに頼らない）
- “押せる” と “選択中” を同じ表現にしない（AP-C2/AP-INT）

### P-05: チップ/タグの意味を分離（操作 vs 表示）
**狙い（AP-INT対策）**: チップが「状態/意味/操作」のどれか曖昧にならない。

- クリックできるチップは `button` として扱い、hover/focusを揃える
- 表示専用のチップは hover させない（ポインタ/下線/色変化で誤認させない）

---

## バックログ（P0/P1/P2）

> **優先度の考え方**: P0=誤操作/迷いの削減、P1=情報階層の安定、P2=細部の整え/確認。

### チケット化テンプレ（コピペ用）
- **Context / Screenshots**: （例: 00, 17 / `.context/screenshots/...`）
- **Problem**: （AP-INT など。何が “誤認” を生むかを1文）
- **Decision**: （適用するパターン: P-01〜P-05）
- **Scope (In/Out)**: （触る範囲、触らない範囲）
- **Likely files**: （入口ファイル）
- **Acceptance**: （3つまでのチェック項目）
- **Verification**: （手動確認の観点 + 可能ならテスト）

| ID | Priority | 対象スクショ | 主な論点 | 提案（要約） | 主な当たり先 | 受入基準（要点） |
| --- | --- | --- | --- | --- | --- | --- |
| BL-001 | P0 | 00, 10-18, 17 | AP-INT | 右カラム（リスト/案内）を P-01（遷移リスト）に統一 | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) 遷移であることが1秒で分かる 2) “入力/選択”に見えない 3) focus-visibleが切れない |
| BL-002 | P0 | 00, 10-18 | AP-INT | 「手続き案内」系タイルを P-02（遷移タイル）へ寄せる（選択UI風を排除） | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) タイル=遷移が一貫 2) 二重の型（選択+遷移）がない |
| BL-003 | P0 | 00, 02, 10-18, 17 | DADS/AP-C2 | 状態表現を P-04 へ（左バー+太字+形）で固定し、色依存を減らす | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) CVDでも状態が分かる 2) 色だけの状態表現がない |
| BL-004 | P0 | 00, 01, 03, 05, 10-18 | a11y | 角丸/カード/タイルで focus-visible がクリップされないことを点検し、必要なら構造を修正 | `src/ui/styles/components.css`, `src/ui/styles/app-components.css`, `index.html` | 1) フォーカスリングが常に視認可能 2) クリック領域が確保される |
| BL-005 | P1 | 11, 13, 15, 18 | AP-H1 | Branding 画面の“装飾の主役化”を抑え、P-03（CTA主導権）へ寄せる | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) CTAが最上位 2) 装飾がCTAと競合しない |
| BL-006 | P1 | 12, 16 | AP-H1 | 強い強調が分散しないよう、強調要素の数/面積/コントラストを抑制 | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) “強調は1つ”が成立 2) 読む順序が自然 |
| BL-007 | P1 | 14 | AP-H2 | ヘッダー/ヒーローの境界が曖昧なら区切りを追加（余白/罫線/影など） | `src/ui/demo/views/palette-preview.render.ts`, `src/ui/styles/components.css` | 1) ヘッダーと本文の塊が分かれる |
| BL-008 | P1 | 01 | AP-H1/AP-INT | Manual view の「制御面」を1箇所に寄せ、行内の押せる/押せないを明確化 | `src/ui/demo/views/manual-view.render.ts`, `src/ui/styles/app-components.css` | 1) “今どこを操作しているか”が分かる 2) クリック領域が判別できる |
| BL-009 | P1 | 03 | AP-INT/AP-C2 | a11y drawer のチップ群を「操作」と「サンプル」に分離し、意味/状態/操作の混線を減らす | `src/ui/demo/a11y-drawer.ts`, `src/ui/demo/views/accessibility-view.render.ts`, `src/ui/styles/components.css` | 1) チップの役割が明確 2) 小さすぎる操作要素がない |
| BL-010 | P2 | 04 | AP-INT | Swatch popover の「閉じる/確定」導線が弱い場合は明示（ボタン/ラベル/配置） | `src/ui/demo/views/studio-view.render.ts`, `src/ui/demo/views/manual-view.render.ts`, `src/ui/styles/app-components.css` | 1) 迷わず閉じられる/確定できる |
| BL-011 | P2 | 05 | AP-H1/a11y | Export dialog のボタン優先度（Copy/Download/Close）を整理、textareaのfocus視認性も確認 | `index.html`, `src/ui/demo/export-handlers.ts` | 1) 主操作が明確 2) focus-visibleが十分 |

---

## FigJam 付箋（コピペ用：スクショ上に貼る文言案）

### 00-studio-view（`../../.context/screenshots/00-studio-view.png`）
- [P0][AP-INT] 右カラム：遷移なのに入力/選択に見える → 行全体リンク + 右矢印（P-01）
- [P0][AP-INT] タイル：選択UI風の表現を外して“遷移”に統一（P-02）
- [P0][a11y] 角丸カード/タイルで focus-visible が切れないか（overflow要注意）

### 01-manual-view（`../../.context/screenshots/01-manual-view.png`）
- [P1][AP-H1] 操作が上下に分散→「制御面」を1箇所に集約（固定/見出し強化）
- [P1][AP-INT] 行内が密で押せる場所が不明瞭→クリック領域/役割を明確化

### 02-cvd-protanopia（`../../.context/screenshots/02-cvd-protanopia.png`）
- [P0][DADS] 状態が色依存になっていないか→形/太字/位置で成立（P-04）

### 03-a11y-drawer（`../../.context/screenshots/03-a11y-drawer.png`）
- [P1][AP-INT] チップ：状態/意味/操作が曖昧→「操作」と「サンプル」を分ける（P-05）
- [P1][a11y] 小さい操作要素：クリック領域/フォーカスリングを確保
- [P0][AP-C2] 色チップが状態/意味を兼務しないよう役割分離

### 04-swatch-popover（`../../.context/screenshots/04-swatch-popover.png`）
- [P2][AP-INT] 閉じる/確定の導線が弱い場合は明示（ボタン配置/ラベル）

### 05-export-dialog（`../../.context/screenshots/05-export-dialog.png`）
- [P2][AP-H1] Download/Close の優先度が曖昧→Copy=主、Download=従、Close=軽量
- [P2][a11y] textarea の focus-visible 視認性を確認

### 10-pastel-hero（`../../.context/screenshots/10-pastel-hero.png`）
- [P0][AP-INT] 右カラム：遷移リストの型を固定（P-01）
- [P0][AP-C2] アクセント色はリンク/CTA優先（状態背景に多用しない）

### 11-pastel-branding（`../../.context/screenshots/11-pastel-branding.png`）
- [P1][AP-H1] BrandingがCTAと競合→ビジュアルを“装飾”へ格下げ（P-03）

### 12-vibrant-hero（`../../.context/screenshots/12-vibrant-hero.png`）
- [P1][AP-H1] 強い強調が分散→“強調は1つ”に制限（CTA主導権）

### 13-vibrant-branding（`../../.context/screenshots/13-vibrant-branding.png`）
- [P1][AP-H1] Brandingが階層を押し下げる→CTA最上位を維持（P-03）

### 14-dark-hero（`../../.context/screenshots/14-dark-hero.png`）
- [P1][AP-H2] ヘッダー/ヒーロー境界が弱い→区切り（余白/影/罫線）で塊を分ける

### 15-dark-branding（`../../.context/screenshots/15-dark-branding.png`）
- [P1][AP-H1] “装飾が主役”に見える→CTAより一段下の強さに調整（P-03）

### 16-highcontrast-hero（`../../.context/screenshots/16-highcontrast-hero.png`）
- [P1][AP-H1] 強コントラスト要素が複数→重要度が均一化。強調は1つだけ

### 17-default-pinpoint（`../../.context/screenshots/17-default-pinpoint.png`）
- [P0][AP-INT] 右カラム：入力/選択に見える→遷移リスト（行全体+矢印）へ（P-01）

### 18-default-branding（`../../.context/screenshots/18-default-branding.png`）
- [P1][AP-H1] Brandingブロックが主役化→CTA主導権を固定（P-03）
