# Requirements Document: シェードUI改善

## Introduction

シェードビュー（DADSカラーパレット表示画面）において、各色シェードにどのセマンティックロール（Primary、Accent、Success、Error等）が割り当てられているかを視覚的に表示する機能を追加する。

**目的**: ユーザーがパレット設計時に、どの色がどのセマンティックロールに使用されているかを一目で把握できるようにする。

**表示方法**: 円形ドットインジケーター + バッジラベル

**表示条件**: ハーモニー種別がDADSのときのみセマンティックロール表示を有効化する

---

## Requirements

### Requirement 1: セマンティックロールマッピング

**Objective:** As a デザイナー, I want シェード画面で各色のセマンティックロール割り当てを確認したい, so that パレット設計時に色の用途を把握できる

#### Acceptance Criteria

1. When ハーモニー種別がDADS（HarmonyType.DADS）の時にシェードビューを表示した時, the システム shall 現在のパレット状態からセマンティックロールマッピングを生成する（DADS以外のハーモニー種別では表示しない）
2. When パレットにDADSセマンティックロール（Success、Error、Warning、Link、Accent）が含まれる時, the システム shall `DADS_COLORS`の chromaName と step から hue-scale（例: blue-600）を特定する
3. When パレットにブランドロール（Primary、Secondary）が含まれる時, the システム shall state.shadesPalettesからname属性が"Primary"または"Secondary"のパレットを検索し、baseChromaName と step が存在する場合のみ hue-scale を特定する（baseChromaName/step が無い場合は hue-scale を空として扱い、ロール名のみ表示する）
4. The システム shall `DADS_COLORS`定義（harmony.ts）を、DADSセマンティック/リンク/アクセントの基準としてのみ参照する
5. If 同一シェードに複数のセマンティックロールが割り当てられている場合, the システム shall 内部的にはすべてのロールを保持し、UIでは最大2つまでバッジ表示 + 残りは「+N」形式で表示する

---

### Requirement 2: 円形ドットインジケーター表示

**Objective:** As a デザイナー, I want 各シェードにセマンティックロールを示すドットを表示したい, so that 一目でロール割り当てを認識できる

#### Acceptance Criteria

1. When シェードにセマンティックロールが割り当てられている時, the システム shall そのシェードスウォッチの右上に円形ドット（直径12px）を表示する
2. The システム shall セマンティックカテゴリごとに異なる色のドットを表示する:
   - Primary: インディゴ系（#6366f1）
   - Secondary: パープル系（#8b5cf6）
   - Accent: ピンク系（#ec4899）
   - Semantic（Success/Error/Warning）: エメラルド系（#10b981）
   - Link: ブルー系（#3b82f6）
3. The システム shall ドットに白い境界線（2px）とドロップシャドウを適用し、どの背景色でも視認性を確保する
4. If シェードにセマンティックロールが割り当てられていない場合, the システム shall ドットを表示しない

---

### Requirement 3: バッジラベル表示

**Objective:** As a デザイナー, I want 各シェードにセマンティックロール名のバッジを表示したい, so that ロールの種類を明確に把握できる

#### Acceptance Criteria

1. When シェードにセマンティックロールが割り当てられている時, the システム shall そのシェードスウォッチの下部にバッジラベルを表示する
2. The システム shall バッジに以下の情報を含める:
   - ロール名（例: "Primary", "Accent-1", "Success"）
   - カテゴリに応じた背景色
   - 白い文字（コントラスト確保）
3. The システム shall バッジのスタイルを以下の通り設定する:
   - フォントサイズ: 9px
   - フォントウェイト: 600（Semi-bold）
   - 角丸: 3px
   - 長いテキストは省略記号（...）で切り詰め
4. If 同一シェードに複数のロールがある場合, the システム shall バッジを縦にスタック表示する（最大2つまで、それ以上は「+N」表示）

---

### Requirement 4: インタラクション

**Objective:** As a デザイナー, I want セマンティックロール表示が他のUI操作を妨げないようにしたい, so that スムーズに作業を続けられる

#### Acceptance Criteria

1. When シェードスウォッチにホバーまたはフォーカスした時, the システム shall そのシェードに割り当てられたセマンティックロールの詳細情報（フルネーム、カテゴリ）をツールチップで表示する
2. The システム shall ドットとバッジの pointer-events を無効化し、スウォッチ自体のクリック/ホバー/フォーカスを妨げない
3. While CVD（色覚多様性）シミュレーションモードが有効な時, the システム shall ドット・バッジのカテゴリ色は固定し、スウォッチのみシミュレーション色を表示する

---

### Requirement 5: パフォーマンス

**Objective:** As a ユーザー, I want セマンティックロール表示がパフォーマンスに影響しないようにしたい, so that スムーズな操作体験を維持できる

#### Acceptance Criteria

1. The システム shall セマンティックロールマッピングの計算を200ms以内に完了する
2. The システム shall DOM要素の追加を最小限に抑え、既存のスウォッチ要素に子要素として追加する

---

## Non-Functional Requirements

### テスト要件
- ユニットテストカバレッジ: 90%以上
- E2Eテスト: シェードビューでのセマンティックロール表示確認

### アクセシビリティ
- スクリーンリーダー対応: スウォッチごとに一意な説明要素を生成し、そのIDを aria-describedby に設定してロール一覧を読み上げ可能にする
  - DADSシェード: `<span id="swatch-{hue}-{scale}-desc">`（例: `swatch-blue-600-desc`）
  - ブランドロール: `<span id="swatch-brand-desc">`（単一キーで全ブランドロールを集約）
- キーボード操作: スウォッチを tabindex="0" でフォーカス可能にする（ドット・バッジ自体は非フォーカス）

### 既存機能との整合性
- 既存のCUDバッジ表示と競合しない配置
- 既存のホバー表示（HEXコード等）との共存
