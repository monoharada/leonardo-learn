# Research & Design Decisions

## Summary
- **Feature**: advanced-color-system-generation
- **Discovery Scope**: Complex Integration（既存システムの大幅拡張 + 新規アルゴリズム）
- **Key Findings**:
  - HCT→OKLCH変換は@material/material-color-utilitiesを使用し、ARGB経由で変換可能
  - CVDシミュレーションはBrettel 1997法が最も正確、linearRGB空間での計算が必須
  - 既存のculori.jsとの統合が可能（両ライブラリとも軽量で並行利用可）

---

## Research Log

### HCT色空間とOKLCH変換

- **Context**: R4（M3準拠シェード生成）でHCT色空間からOKLCHへの変換が必要
- **Sources Consulted**:
  - [@material/material-color-utilities](https://github.com/material-foundation/material-color-utilities) - Google公式TypeScript実装
  - [npm: @material/material-color-utilities](https://www.npmjs.com/package/@material/material-color-utilities)
  - Material 3 Themes documentation
- **Findings**:
  - HCT = Hue(CAM16) + Chroma(CAM16) + Tone(L* from CIE-Lab)
  - トーン差40で3:1コントラスト、トーン差50で4.5:1コントラストが保証
  - HCT値の範囲: H(0-360°), C(0-約120), T(0-100)
  - HCT↔ARGB↔OKLCHの変換パスが必要（直接変換APIなし）
  - `@material/material-color-utilities`のバンドルサイズは約30KB（gzip後約10KB）
- **Implications**:
  - 新規依存: `@material/material-color-utilities`を追加
  - 変換パス: HCT → ARGB → RGB → OKLCH（culori経由）
  - 精度: ΔE < 0.01の許容誤差を満たすことが可能

### CVDシミュレーション（色覚多様性）

- **Context**: R3（セマンティック衝突回避）でCVDモードの識別可能性検証が必要
- **Sources Consulted**:
  - [DaltonLens - Review of Open Source CVD Simulations](https://daltonlens.org/opensource-cvd-simulation/)
  - [Brettel et al. 1997 paper](https://www.researchgate.net/publication/38015459)
  - [jsColorblindSimulator](https://mapeper.github.io/jsColorblindSimulator/)
  - [Myndex CVD Simulator](https://www.myndex.com/CVD/)
- **Findings**:
  - **推奨アルゴリズム**: Brettel 1997（Protanopia/Deuteranopia/Tritanopia全対応）
  - **注意**: 必ずlinearRGB空間で計算（sRGB直接変換は不正確）
  - **計算コスト**: 3x3行列乗算×2（Brettel）、1ピクセルあたり非常に軽量
  - **避けるべき実装**: ColorMatrix（colorjack）は精度が低い
  - **Tritanopia**: Brettel法のみが信頼性あり（単一行列では不可）
- **Implications**:
  - 自前実装またはlibDaltonLensポート（MIT/Public Domain）
  - sRGB→linearRGB→LMS→CVD変換→LMS→linearRGB→sRGBのパイプライン
  - 実装サイズは小さい（行列定数+変換関数）

### キャッシュ戦略とパフォーマンス

- **Context**: R9（パフォーマンス）で50ms/300msの目標達成
- **Sources Consulted**:
  - 既存コードベース分析（solver.ts, interpolation.ts）
  - MDN Web Workers documentation
- **Findings**:
  - 現在のsolver.tsは20回の二分探索イテレーション（1色あたり）
  - culori.jsの補間は十分高速
  - キャッシュキー: `${baseColor}-${role}-${mode}`形式でハッシュ化
  - Map vs WeakMap: Mapがシンプルで十分（ColorSystemインスタンス寿命内）
- **Implications**:
  - LRU Cacheは過剰、シンプルなMapで十分
  - Web Workerは初期実装では不要（50ms/300ms目標は達成可能）
  - プロファイリングで必要性を判断後に導入

### エクスポートフォーマット

- **Context**: R7（出力フォーマットとエクスポート）の技術詳細
- **Sources Consulted**:
  - [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/)
  - [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)
- **Findings**:
  - DTCG形式: `$value`, `$type`, `$description`プロパティ
  - Tailwind: `theme.extend.colors`への挿入形式
  - CSS: `@supports (color: oklch(0 0 0))`による広色域検出
  - P3 fallback: `@media (color-gamut: p3)`
- **Implications**:
  - Exporterインターフェースでプラグイン化
  - 各フォーマット専用のシリアライザーを実装

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Facade + Strategy | ColorSystemがファサード、各モード（M3/DADS）がStrategy | 既存coreを変更せず拡張、モード切替が明確 | Strategy間の共通処理が重複する可能性 | **採用** |
| Decorator | 既存Themeをデコレートして機能追加 | 最小の変更、単一責任 | 多重デコレートで複雑化 | 部分採用可 |
| Full Rewrite | 新しいColorSystem3クラスで全て再実装 | クリーンな設計 | 既存コードの再利用不可、工数大 | 却下 |

---

## Design Decisions

### Decision: HCT変換の実装方式

- **Context**: M3準拠シェード生成でHCT色空間が必要
- **Alternatives Considered**:
  1. @material/material-color-utilitiesを直接使用
  2. HCT計算を自前実装（CAM16 + L*）
  3. 近似変換のみ（トーン≒Lightness%）
- **Selected Approach**: @material/material-color-utilitiesを直接使用
- **Rationale**:
  - Google公式実装で精度が保証
  - TypeScript対応済み
  - メンテナンスコストゼロ
- **Trade-offs**:
  - 新規依存追加（約30KB）
  - ARGB経由の変換でわずかなオーバーヘッド
- **Follow-up**: バンドルサイズへの影響を測定

### Decision: CVDシミュレーションの実装方式

- **Context**: セマンティック衝突回避でCVD検証が必要
- **Alternatives Considered**:
  1. 外部ライブラリ（color-blind npm）
  2. Brettel 1997の自前実装
  3. 簡易行列変換（Viénot 1999）
- **Selected Approach**: Brettel 1997の自前実装
- **Rationale**:
  - Tritanopiaに対応できる唯一の信頼性ある手法
  - 実装サイズが小さい（行列定数+関数約100行）
  - 依存追加を避けられる
- **Trade-offs**:
  - 初期実装コスト
  - テストケースの作成が必要
- **Follow-up**: DaltonLensのテストケースを参照して検証

### Decision: アーキテクチャパターン

- **Context**: 既存coreの拡張方式
- **Alternatives Considered**:
  1. Facade + Strategy
  2. Decorator
  3. Full Rewrite
- **Selected Approach**: Facade + Strategy
- **Rationale**:
  - ColorSystemがファサードとして統合エントリーポイント
  - M3/DADSモードをStrategyとして切り替え可能
  - 既存のColor/Theme/Solverを変更せず再利用
- **Trade-offs**:
  - 新規ファイル追加（system/配下）
  - Strategy間の共通処理は基底クラス/ミックスインで対応
- **Follow-up**: なし

### Decision: キャッシュ戦略

- **Context**: パフォーマンス目標達成
- **Alternatives Considered**:
  1. LRU Cache
  2. Simple Map
  3. WeakMap
- **Selected Approach**: Simple Map
- **Rationale**:
  - ColorSystemインスタンス寿命内でのキャッシュで十分
  - LRUの複雑さは不要
  - WeakMapはキー制約が厳しい
- **Trade-offs**:
  - メモリ上限なし（大量生成時に注意）
- **Follow-up**: メモリ使用量をプロファイリング

---

## Risks & Mitigations

1. **HCT→OKLCH変換の精度** - @material公式ライブラリ使用で軽減。変換テストで許容誤差（ΔE < 0.01）を検証
2. **CVDシミュレーションの正確性** - Brettel 1997論文の実装を採用、DaltonLensのテストケースで検証
3. **パフォーマンス目標未達** - 初期実装後にプロファイリング、必要に応じてWeb Worker化
4. **バンドルサイズ増加** - @material/material-color-utilities（約30KB）追加。Tree-shakingで最小化
5. **既存UIとの統合** - ColorSystemを段階的に導入、demo.tsは後からリファクタリング

---

## References

- [@material/material-color-utilities](https://github.com/material-foundation/material-color-utilities) - Google公式HCT実装
- [DaltonLens CVD Simulation Review](https://daltonlens.org/opensource-cvd-simulation/) - CVDアルゴリズム比較
- [Brettel et al. 1997](https://www.researchgate.net/publication/38015459) - CVDシミュレーション原論文
- [W3C Design Tokens](https://design-tokens.github.io/community-group/) - DTCGフォーマット仕様
- [Myndex CVD Simulator](https://www.myndex.com/CVD/) - Brettel実装の参照実装
