# Studioビュー改善（統合版 v2）

Date: 2026-01-17
Status: Approved (User: "APPROVE PLAN")

## Source / Inputs
- `.codex/plans/2026-01-17-opus-harsh-review-response.md`
- `.codex/plans/2026-01-17-opus-review-studio.md`
- 追加要望: メインビジュアル（幾何学SVG）を複数パターンでランダム挿入し、複数アクセントカラーを活用したい。ニュートラル背景も白〜グレー〜クリーム寄りで微妙にランダム化したい。

## Goals
- 初見で目的と導線が分かり、作業の“主線”が途切れない。
- Studioのツールバーを簡潔にしつつ、探索→微調整→持ち帰り（Export/Copy/Share）を高速化する。
- プレビューの説得力（コンテキスト感・当たり感）を上げる。
- 生成AIやモデル選択は実装しない（非要件）。

## Non-goals
- 生成AI（モデル選択/Creativity=AI）導入
- 生成ロジックの全面刷新（DADSトークン制約は維持）
- 既存ビューの大規模リライト

## Priorities

### P0: 概念整理（導線）
- トップナビの「生成」とStudio内「Generate」の概念競合を解消（命名/説明）。
- Studioを“メインの探索導線”として扱い、他ビューは詳細（確認/調整）として位置づける。

### P0: ツールバー再設計（情報密度を下げる）
- スウォッチは「色 +（必要なら）ロック」中心へ。
- WCAGバッジは常時表示から退避（Failのみ常時、詳細はホバー/詳細パネル）。

### P0: ロックUIの整合
- ロック対象と実挙動を一致させる（Primary/Accent中心）。
- 固定色（DADS固定）の“ロックもどき”を撤去 or disabled＋説明。

### P0: Presets UIの信頼性
- `<select>`依存による「開かない/気づけない」問題に備え、popoverメニューへ置換（`aria-expanded`＋キーボード対応）。

### P1: 編集体験の短縮
- Primary swatch起点で即編集できる（下部入力への誘導をなくす/縮退）。
- HEXコピーをスウォッチ内に常設（ワンクリック＋トースト）。

### P1: ExportとShareの明確化
- Exportは「CSS/Tailwind/JSON」をクリック前に見せる（期待値を作る）。
- URL share（hashエンコード）＋Copy Link を追加。

### P2: プレビューの多様化（テンプレ/メインビジュアル）
- Huemintほどのカテゴリは不要だが、「Hero/Form/Cards」など2〜3テンプレ切替を用意。
- ヒーロー右側のメインビジュアル（KV）を、幾何学SVGの複数パターンから“安定ランダム”（seed）で選択。
  - Studioに「Shuffle/Lock（固定）」を置き、ユーザーが明示的にKVバリエーションを変更/固定できるようにする。
  - Primary/Accentに加え、Success/Warning/Errorも薄く混ぜて“複数アクセント”を表現。
  - ニュートラル背景は white / gray-50 / gray-100 に加え、cream寄りの微差（color-mix）も候補にする。
  - “行政っぽさ”の制約: 余白多め・規則的・低彩度（opacityで抑制）・線幅一定。

### P2: “探索の楽しさ”を作る（AIなし）
- Accent候補の抽選母集団TopN幅・重み揺らぎ・除外ルールをスライダー化。

## Test plan
- `bun run type-check`
- `bun test`
- 影響がある場合のみ `bun run test:e2e`
- 手動確認（Studio/Preview）:
  - Presetsが確実に操作できる
  - ロックが“効くものだけ”として理解できる
  - Copy/Export/Shareが迷わず使える
  - メインビジュアル（KV）が複数パターンで自然に変化し、過度に派手にならない
