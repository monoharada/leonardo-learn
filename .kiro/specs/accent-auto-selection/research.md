# Research & Design Decisions: アクセントカラー自動選定

---
**Purpose**: 技術設計書（design.md）作成の根拠となる調査結果とアーキテクチャ判断を記録する。

**Usage**:
- 発見フェーズで収集した情報を構造化
- 設計判断のトレードオフを詳細に文書化
- 将来の監査・再利用のための参照先
---

## Summary
- **Feature**: accent-auto-selection
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  1. 既存CUDモジュール（`harmony-score.ts`, `service.ts`）が再利用可能な計算基盤を提供
  2. DADSデータプロバイダー（`dads-data-provider.ts`）が130色の候補アクセスを提供
  3. 状態管理（`state.ts`）に背景色変更機能が既存実装済み
  4. ハーモニーフィルタは`calculateHueDistanceScore()`の色相計算ロジックを流用可能

## Research Log

### 既存CUDモジュールの再利用性評価

- **Context**: 要件2.1でCUDスコア計算に`findNearestCudColor()`を使用することが指定されている
- **Sources Consulted**:
  - `src/core/cud/service.ts` - CUD色検索API
  - `src/core/cud/harmony-score.ts` - 調和スコア計算
- **Findings**:
  - `findNearestCudColor(hex)`: OKLab空間でのΔE値を返す（要件2.1のCUDスコア計算に直接利用可能）
  - `calculateHueDistanceScore(anchor, palette)`: 色相距離スコアを0-100で返す（要件2.1のハーモニースコアに利用可能）
  - `getContrast(color1, color2)`: WCAG 2.1コントラスト比を返す（`src/utils/wcag.ts`）
- **Implications**:
  - スコア計算の3指標は既存関数を組み合わせて実装可能
  - 新規モジュールは計算オーケストレーションに集中

### DADSデータプロバイダーの構造

- **Context**: 要件1.1で「DADSの全候補（10色相×13ステップ = 130色）」を評価する必要がある
- **Sources Consulted**: `src/core/tokens/dads-data-provider.ts`
- **Findings**:
  - `loadDadsTokens()`: 非同期でDADSトークン配列を返す（キャッシュ機構あり）
  - `getAllDadsChromatic(tokens)`: 10色相のカラースケール配列を取得
  - `getScaleOrder()`: 13ステップの順序定義（50, 100, ..., 1200）
  - 各`DadsToken`は`hex`, `nameJa`, `nameEn`を保持
- **Implications**:
  - 130色のイテレーションはO(n)で単純ループ可能
  - トークンキャッシュにより複数回呼び出しでもパフォーマンス影響なし

### 背景色連携の仕組み

- **Context**: 要件2.4でコントラストスコア再計算時に背景色変更を検知する必要がある
- **Sources Consulted**: `src/ui/demo/state.ts`
- **Findings**:
  - `state.lightBackgroundColor` / `state.darkBackgroundColor`: ライト/ダーク別の背景色
  - `determineColorMode(hex)`: OKLCH明度から自動判定
  - `persistBackgroundColors()` / `loadBackgroundColors()`: localStorage永続化
- **Implications**:
  - アクセント選定時の背景色取得は`state`から直接参照
  - 背景色変更イベントのリスナー実装が必要

### ハーモニータイプのフィルタリング

- **Context**: 要件3.1で補色・トライアド・類似色等のフィルタ提供が必要
- **Sources Consulted**:
  - `src/core/cud/harmony-score.ts` - `calculateHueDistance()`
  - 要件書のハーモニー定義
- **Findings**:
  - 円周上の色相距離計算は既存実装あり（0-180度）
  - フィルタ定義:
    - 補色: +180°
    - トライアド: +120°, +240°
    - 類似色: ±30°
    - 分裂補色: +150°, +210°
  - ±30°判定は循環距離で行う必要あり
- **Implications**:
  - ハーモニータイプごとのターゲット色相を計算
  - 各候補の色相とターゲット色相との距離が±30°以内かを判定

### UI配置とコンポーネント構成

- **Context**: 要件4.xでアクセント選定パネルのUI設計が必要
- **Sources Consulted**:
  - `src/ui/demo/sidebar.ts` - 既存サイドバー構造
  - `src/ui/cud-components.ts` - CUD関連UIコンポーネント
- **Findings**:
  - 既存UIはモジュール分離されたVanilla TSで構成
  - `state`を直接参照するパターンが確立
  - カード形式のレンダリングパターンあり
- **Implications**:
  - 新規UIコンポーネントは`src/ui/accent-selector/`に配置
  - 既存の`state`管理パターンに従う

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Service Layer | 計算ロジックをサービス層に集約 | テスタブル、再利用性高 | UI連携コード増加 | 推奨 |
| Hook-based | UIフックに計算を埋め込み | シンプル、直感的 | テスト困難、再利用困難 | 却下 |
| Event-driven | イベントバスで疎結合 | 拡張性高 | オーバーエンジニアリング | 将来検討 |

**選択**: Service Layer - 既存`src/core/cud/`のパターンに整合

## Design Decisions

### Decision: バランススコア計算のモジュール配置

- **Context**: 3指標（ハーモニー・CUD・コントラスト）の加重平均計算をどこに配置するか
- **Alternatives Considered**:
  1. `src/core/accent/score-calculator.ts` - 新規ドメインモジュール
  2. `src/core/cud/harmony-score.ts` - 既存モジュールに追加
  3. `src/ui/accent-selector/accent-service.ts` - UI層に配置
- **Selected Approach**: 選択肢1 - 新規ドメインモジュール`src/core/accent/`
- **Rationale**:
  - アクセント選定は独立した機能ドメイン
  - CUDモジュールの単一責任を維持
  - 将来の拡張（M3ハーモニータイプ等）に対応しやすい
- **Trade-offs**:
  - 新規ディレクトリ作成のオーバーヘッド
  - 既存CUDモジュールへの依存が発生
- **Follow-up**: 依存方向がUI→Core→Utilsを維持していることを確認

### Decision: メモ化戦略

- **Context**: 要件6.2で同一条件での再計算回避が必要
- **Alternatives Considered**:
  1. 関数レベルメモ化（`Map<string, Result>`）
  2. LRUキャッシュ
  3. React useMemやuseMemo（UIフック）
- **Selected Approach**: 選択肢1 - 関数レベルメモ化
- **Rationale**:
  - 130色のスコア計算結果をキャッシュ
  - キー: `${brandColorHex}_${backgroundHex}_${weightsHash}`
  - UIフレームワーク非依存
- **Trade-offs**:
  - 手動キャッシュ無効化が必要（重み変更時）
  - メモリ使用量増加（許容範囲）
- **Follow-up**: パフォーマンステストで200ms以内を確認

### Decision: 重み正規化アルゴリズム

- **Context**: 要件2.3で重みの合計を100に正規化する必要がある
- **Alternatives Considered**:
  1. 単純な比例配分（各値/合計×100）
  2. 四捨五入 + 最大値への差分調整
  3. 最初に0を排除してから計算
- **Selected Approach**: 選択肢2 - 四捨五入 + 最大値調整
- **Rationale**:
  - 要件で明示的に「四捨五入後、合計が100にならない場合は最大の重みへ差分を加算」と指定
  - 整数の重みで合計100を保証
- **Trade-offs**:
  - 最大値が複数ある場合の挙動を定義する必要
  - 追加ロジックが必要

### Decision: UIコンポーネント構成

- **Context**: アクセント選定パネルをどのように構成するか
- **Alternatives Considered**:
  1. 単一大規模コンポーネント
  2. 機能別に分離（パネル、カードグリッド、フィルタ、重みスライダー）
  3. Web Componentsとして独立
- **Selected Approach**: 選択肢2 - 機能別分離
- **Rationale**:
  - 既存UI構造（`sidebar.ts`, `editor.ts`等）との整合性
  - 単体テスト容易
  - 段階的実装に適合
- **Trade-offs**:
  - コンポーネント間の状態同期が必要
  - ファイル数増加

## Risks & Mitigations

- **Risk 1**: DADSデータ読み込み失敗時のフォールバック
  - **Mitigation**: 要件7.1に従い機能無効化 + 明確なエラーメッセージ表示

- **Risk 2**: 200ms以内のパフォーマンス要件未達
  - **Mitigation**: メモ化実装 + 計算処理の最適化（早期リターン、並列計算）

- **Risk 3**: 背景色変更時のUI更新漏れ
  - **Mitigation**: 背景色変更イベントのリスナー登録 + 明示的な再計算トリガー

- **Risk 4**: 重み正規化での端数処理誤差
  - **Mitigation**: 単体テストで境界値（0, 100, 合計非100）を網羅的に検証

## References

- [DADS Design Tokens](https://github.com/digital-go-jp/design-tokens) - デジタル庁デザインシステム
- [CUD推奨配色セット ver.4](https://jfly.uni-koeln.de/colorset/) - カラーユニバーサルデザイン
- [WCAG 2.1 Success Criterion 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - コントラスト要件
- 既存実装: `src/core/cud/harmony-score.ts`, `src/core/cud/service.ts`
