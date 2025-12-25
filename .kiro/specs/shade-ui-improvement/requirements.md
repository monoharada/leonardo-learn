# Requirements Document: シェードUI改善

## Introduction

シェードビュー（DADSカラーパレット表示画面）において、各色シェードにどのセマンティックロール（Primary、Accent、Success、Error等）が割り当てられているかを視覚的に表示する機能を追加する。

**目的**: ユーザーがパレット設計時に、どの色がどのセマンティックロールに使用されているかを一目で把握できるようにする。

**表示方法**: セマンティックロール割り当てスウォッチの円形化 + 欄外ロール情報 + コントラスト比境界表示

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
5. If 同一シェードに複数のセマンティックロールが割り当てられている場合, the システム shall 内部的にはすべてのロールを保持する（UI表示は要件2/3で定義）

---

### Requirement 2: セマンティックロールスウォッチの円形化

**Objective:** As a デザイナー, I want セマンティックロールが割り当てられたシェードを視覚的に区別したい, so that 一目でロール割り当てを認識できる

#### Acceptance Criteria

1. When シェードにセマンティックロールが割り当てられている時, the システム shall そのシェードスウォッチ自体を円形に変形する（border-radius: 50%）
2. The システム shall 円形スウォッチの中央にロールラベル（1-2文字）を表示する:
   - Primary: 「P」
   - Secondary: 「S」
   - Accent: 「A」（複数ある場合は「A1」「A2」等）
   - Success: 「Su」（Secondaryとの区別のため2文字）
   - Error: 「E」
   - Warning: 「W」
   - Link: 「L」
   - **優先順位**: 複数ロールがある場合、Primary > Secondary > Accent > Semantic > Link の順で最優先ロールのラベルを中央に表示（他ロールは欄外で確認可能）
3. The システム shall ラベルの文字色を背景色とのコントラストに応じて自動調整する（明るい背景→黒文字、暗い背景→白文字）
4. If シェードにセマンティックロールが割り当てられていない場合, the システム shall 通常の四角形スウォッチのまま表示する
5. The システム shall 円形スウォッチのサイズを隣接する四角形スウォッチと同等に保つ
6. The システム shall ブランドロール（Primary/Secondary）もDADSシェード上で円形化対象とする（hue-scaleが特定できる場合）

---

### Requirement 3: 欄外ロール情報表示

**Objective:** As a デザイナー, I want セマンティックロール情報を見切れなく表示したい, so that ロールの種類を明確に把握できる

#### Acceptance Criteria

1. When シェードにセマンティックロールが割り当てられている時, the システム shall ロール情報をスウォッチ欄外（カラーパレットの下部）に表示する
2. The システム shall 欄外ロール情報に以下を含める:
   - ロール名（例: "Primary", "Accent-Blue", "Link-Default"）- 見切れなしで完全表示
   - 対応するscale値（例: 500, 1000）
   - カテゴリに応じた背景色バッジ
3. The システム shall 欄外ロール情報のスタイルを以下の通り設定する:
   - フォントサイズ: 11px
   - フォントウェイト: 500（Medium）
   - 角丸: 4px
   - パディング: 2px 8px
   - 白い文字（コントラスト確保）
4. The システム shall 円形スウォッチから欄外ロール情報への視覚的な関連性を示す（縦線または位置揃え）
5. If 同一色相に複数のロールがある場合, the システム shall 全てのロールを水平に並べて表示する

---

### Requirement 4: インタラクション

**Objective:** As a デザイナー, I want セマンティックロール表示が他のUI操作を妨げないようにしたい, so that スムーズに作業を続けられる

#### Acceptance Criteria

1. When シェードスウォッチにホバーまたはフォーカスした時, the システム shall そのシェードに割り当てられたセマンティックロールの詳細情報（フルネーム、カテゴリ）をツールチップで表示する
2. The システム shall 円形スウォッチの中央ラベルと欄外ロール情報の pointer-events を無効化し、スウォッチ自体のクリック/ホバー/フォーカスを妨げない
3. While CVD（色覚多様性）シミュレーションモードが有効な時, the システム shall 欄外ロール情報のカテゴリ色およびコントラスト境界ピルの色は固定し、スウォッチのみシミュレーション色を表示する

---

### Requirement 5: パフォーマンス

**Objective:** As a ユーザー, I want セマンティックロール表示がパフォーマンスに影響しないようにしたい, so that スムーズな操作体験を維持できる

#### Acceptance Criteria

1. The システム shall セマンティックロールマッピングの計算およびコントラスト境界計算を200ms以内に完了する
2. The システム shall DOM要素の追加を最小限に抑える:
   - 円形スウォッチの中央ラベル: 既存スウォッチ要素の子要素として追加
   - 欄外ロール情報バー: 色相セクションの直後に新規要素として追加
   - コントラスト境界インジケーター: 色相セクションの直後に新規要素として追加

---

### Requirement 6: コントラスト比境界表示

**Objective:** As a デザイナー, I want 各スケールのコントラスト比を視覚的に把握したい, so that WCAG準拠の色選択ができる

#### Acceptance Criteria

1. The システム shall 各色相のシェードパレット下部にコントラスト比境界インジケーターを表示する
2. The システム shall 白背景に対するコントラスト比境界を表示する:
   - 「3:1→」ピル: 白背景に対して3:1以上のコントラスト比を持つスケール範囲の開始位置（白抜きスタイル）
   - 「4.5:1→」ピル: 白背景に対して4.5:1以上のコントラスト比を持つスケール範囲の開始位置（白抜きスタイル）
3. The システム shall 黒背景に対するコントラスト比境界を表示する:
   - 「←4.5:1」ピル: 黒背景に対して4.5:1以上のコントラスト比を持つスケール範囲の終了位置（黒塗りスタイル）
   - 「←3:1」ピル: 黒背景に対して3:1以上のコントラスト比を持つスケール範囲の終了位置（黒塗りスタイル）
4. The システム shall ピルのスタイルを以下の通り設定する:
   - 白背景用（白抜き）: border: 1px solid #333, background: transparent, color: #333, border-radius: 9999px
   - 黒背景用（黒塗り）: border: none, background: #333, color: white, border-radius: 9999px
   - フォントサイズ: 10px
   - パディング: 2px 8px
5. The システム shall ピルを対応するスケールの下部に配置し、どのスケールから/までが基準を満たすか視覚的に示す
6. The システム shall コントラスト比計算にWCAG 2.x相対輝度アルゴリズムを使用する

---

## Non-Functional Requirements

### テスト要件
- ユニットテストカバレッジ: 90%以上
- E2Eテスト: シェードビューでのセマンティックロール表示確認

### アクセシビリティ
- スクリーンリーダー対応: スウォッチごとに一意な説明要素を生成し、そのIDを aria-describedby に設定してロール一覧を読み上げ可能にする
  - DADSシェード: `<span id="swatch-{hue}-{scale}-desc">`（例: `swatch-blue-600-desc`）
  - ブランドロール（hue-scale特定可能）: 該当DADSシェードのIDにロール情報をマージ（専用ID不使用）
  - ブランドロール（hue-scale不定）: スウォッチ円形化なし、欄外情報のみで表示（ARIA ID不要）
- キーボード操作: スウォッチを tabindex="0" でフォーカス可能にする（中央ラベル・欄外情報自体は非フォーカス）

### 既存機能との整合性
- 既存のCUDバッジ表示と競合しない配置
- 既存のホバー表示（HEXコード等）との共存
