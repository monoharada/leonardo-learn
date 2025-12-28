# Requirements Document: アクセントカラー自動選定

## Introduction

ブランドカラー（Primary）に対して相性の良いアクセントカラーを、DADSカラーシェードから自動的に選定する機能を追加する。

**目的**: デザイナーがアクセントカラーを選ぶ際に、ハーモニー（色相関係）、CUD適合性、コントラストのバランスを考慮した最適な候補を自動提案する。

**選定基準**: バランス重視（ハーモニー40% + CUD30% + コントラスト30%のスコアリング）

---

## Requirements

### Requirement 1: アクセント候補生成

**Objective:** As a デザイナー, I want ブランドカラーに基づいてアクセント候補を自動生成したい, so that 最適なアクセントカラーを効率的に選べる

#### Acceptance Criteria

1. When ブランドカラーが設定されている時, the システム shall DADSの全候補（10色相×13ステップ = 130色）に対してスコアを計算し、同スコアの場合は主要ステップ（500, 600, 700, 800）を優先してソートする
2. The システム shall 各候補に対してバランススコア（0-100）を計算する
3. The システム shall スコア上位の候補（デフォルト: 上位10件）を推奨リストとして提供する
4. If ブランドカラーが設定されていない場合, the システム shall アクセント選定機能を無効化し、ブランドカラーの設定を促す

---

### Requirement 2: バランススコア計算

**Objective:** As a デザイナー, I want 複数の評価基準でアクセントカラーを評価したい, so that 総合的に最適な選択ができる

#### Acceptance Criteria

1. The システム shall 以下の3つの指標を計算する:
   - ハーモニースコア（0-100）: ブランドカラーとの色相関係を評価（`harmony-score.ts` の `calculateHueDistanceScore()` を使用）
   - CUDスコア（0-100）: CUD推奨色との近さを評価（`cud/service.ts` の `findNearestCudColor()` から ΔE を取得し、`score = clamp(0, 100, 100 - (deltaE / 0.20) * 100)` で正規化）
   - コントラストスコア（0-100）: 現在選択中の背景色（`state.backgroundColor`）とのコントラスト比を評価
2. The システム shall デフォルトの重み付けを適用する: ハーモニー40%、CUD30%、コントラスト30%
3. When ユーザーが重み付けを調整した時, the システム shall 新しい重みでスコアを再計算する
4. When 背景色が変更された時, the システム shall コントラストスコアのみを再計算し、総合スコアを更新する
5. The システム shall 各候補のスコア内訳（3指標それぞれの値）を表示可能にする

---

### Requirement 3: ハーモニー方向フィルタ

**Objective:** As a デザイナー, I want ハーモニーの方向性を選択したい, so that 意図したカラースキームを作成できる

#### Acceptance Criteria

1. The システム shall 以下のハーモニータイプでフィルタリングを提供する:
   - 補色（Complementary）: 色相 +180°
   - トライアド（Triadic）: 色相 +120°, +240°
   - 類似色（Analogous）: 色相 ±30°
   - 分裂補色（Split Complementary）: 色相 +150°, +210°
   - 全候補（All）: フィルタなし
2. When ハーモニータイプが選択された時, the システム shall 対象色相から±30°以内の候補のみを表示する
3. The システム shall フィルタ適用後もスコア順でソートを維持する
4. If フィルタ適用後に候補が0件になった場合, the システム shall 最も近い色相の候補を3件まで代替表示する

---

### Requirement 4: アクセント選定UI

**Objective:** As a デザイナー, I want 視覚的にアクセントカラーを選定したい, so that 直感的に選択できる

#### Acceptance Criteria

1. When 「アクセント自動選定」ボタンをクリックした時, the システム shall アクセント選定パネルを表示する
2. The システム shall 候補をカードグリッド形式で表示し、各カードに以下を含める:
   - カラースウォッチ（大）
   - DADSソース名（例: "Blue 600"）
   - 総合スコア
   - スコア内訳（ホバー時またはクリック時）
3. When 候補カードをクリックした時, the システム shall その色をアクセントカラーとして選択し、パレットに追加する
4. The システム shall 選択したアクセントを後から調整（削除、別候補への変更）可能にする

---

### Requirement 5: 手動調整機能

**Objective:** As a デザイナー, I want 自動選定に加えて手動でもアクセントを追加したい, so that 自由度の高い設計ができる

#### Acceptance Criteria

1. The システム shall 「カスタムアクセント追加」機能を提供する
2. When カスタムアクセントを追加する時, the システム shall DADSシェード一覧から任意の色を選択可能にする
3. The システム shall 手動追加した色に対してもバランススコアを計算し、表示する
4. If 手動追加した色のスコアが低い（50未満）場合, the システム shall 警告を表示しつつ追加を許可する

---

### Requirement 6: パフォーマンス

**Objective:** As a ユーザー, I want アクセント選定が高速に動作してほしい, so that 待ち時間なく作業できる

#### Acceptance Criteria

1. The システム shall 全候補（130色: 10色相×13ステップ）のスコア計算を200ms以内に完了する
2. The システム shall スコア計算結果をメモ化し、同一ブランドカラー・同一背景色での再計算を回避する
3. When ハーモニーフィルタを切り替えた時, the システム shall フィルタリングのみを実行し、スコア再計算は行わない

---

## Non-Functional Requirements

### テスト要件
- ユニットテストカバレッジ: 90%以上
- スコア計算の精度テスト: 既知の色ペアで期待スコアを検証

### データ依存
- DADSトークン（`dads-data-provider.ts`）
- ハーモニースコア: `harmony-score.ts` の `calculateHueDistanceScore()` を再利用
- CUDスコア: `cud/service.ts` の `findNearestCudColor()` を使用（ΔE値を取得し正規化）
- 背景色: `state.backgroundColor`（背景色変更機能と連携）

### 将来拡張性
- 重み付けのプリセット保存機能（将来）
- M3（Material Design 3）ハーモニータイプ対応（将来）
