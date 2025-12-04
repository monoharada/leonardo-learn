# Research & Design Decisions: CUD Color Integration

---
**Purpose**: CUD推奨配色セット統合に関する調査結果と設計判断の記録

---

## Summary
- **Feature**: `cud-color-integration`
- **Discovery Scope**: Extension（既存システムへの機能拡張）
- **Key Findings**:
  - 既存CVDシミュレーター（Brettel行列）を最大限活用可能
  - `calculateSimpleDeltaE`が存在するが、OKLab純粋ユークリッド距離が追加で必要
  - `src/core/cud/`新規ディレクトリでドメイン分離が最適

## Research Log

### CUD ver.4 公式色データの出典

- **Context**: CUD 20色の正確なHEX/RGB値を確認
- **Sources Consulted**:
  - [jfly公式ページ](https://jfly.uni-koeln.de/colorset/)
  - [CUD_color_set_GuideBook_2018.pdf](https://jfly.uni-koeln.de/colorset/CUD_color_set_GuideBook_2018.pdf)
  - [CUDO公式](https://cudo.jp/?page_id=1565)
  - [DIC株式会社プレスリリース](https://www.dic-global.com/ja/news/2018/products/20180730000000.html)
- **Findings**:
  - CUD ver.4は2018年に改訂されたガイドブック第2版
  - 20色構成: アクセント9色、ベース7色、無彩色4色
  - RGB指定値、CMYK指定値、日本塗料工業会色票番号、マンセル値が提供
  - 画面用はRGB値を使用（HEXに変換可能）
- **Implications**:
  - 公式PDFからRGB値を抽出し、HEX変換してデータ定義
  - culori.jsでOKLCH/OKLab値を計算・キャッシュ

### 既存CVDシミュレーターの評価

- **Context**: Requirement 3のCVDシミュレーション要件に対する既存アセット評価
- **Sources Consulted**:
  - `src/accessibility/cvd-simulator.ts` - 既存実装
  - Brettel 1997, Viénot 1999, Machado 2009の行列アルゴリズム
- **Findings**:
  - 既存実装はBrettel/Viénotベースの行列を使用
  - protanopia, deuteranopia, tritanopia, achromatopsiaの4タイプ対応済み
  - 戻り値は`Color`オブジェクトのみ（OKLab/OKLCH形式は未提供）
- **Implications**:
  - 既存`simulateCVD`を内部利用し、新規`simulateCvdWithFormats`でラップ
  - 後方互換性を維持しつつ拡張形式を追加

### OKLab deltaE計算方式

- **Context**: Requirement 9のdeltaEok計算方式の決定
- **Sources Consulted**:
  - `src/accessibility/distinguishability.ts` - 既存`calculateSimpleDeltaE`
  - OKLab色空間仕様（Björn Ottosson）
- **Findings**:
  - 既存`calculateSimpleDeltaE`はOKLCH座標を直交変換してユークリッド距離計算
  - CUD仕様ではOKLab空間での純粋ユークリッド距離を使用
  - `deltaEok = sqrt((L2-L1)² + (a2-a1)² + (b2-b1)²)`
- **Implications**:
  - `src/utils/color-space.ts`に`toOklab`と`deltaEok`を追加
  - culori.jsの`converter("oklab")`を活用

### UI表示パターンの検討

- **Context**: Requirement 6-7のUI統合におけるissue表示方式
- **Sources Consulted**:
  - `src/ui/demo.ts` - 既存DADSモード実装
  - 川崎市カラーユニバーサルデザインガイドライン
- **Findings**:
  - 既存UIはカード形式でハーモニー表示
  - issue数が多い場合（>5件）にスクロールが必要
  - 段階的開示（アコーディオン）パターンが有効
- **Implications**:
  - error/warning/infoの3カラム表示
  - 5件以上のissueはアコーディオン形式で折りたたみ

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存拡張のみ | cvd-simulator.ts等を直接拡張 | ファイル数抑制 | 既存ファイル肥大化 | 単純だが保守性低下リスク |
| B: 新規ディレクトリ | src/core/cud/に全機能集約 | 責任分離、テスト容易 | ファイル数増加 | 推奨 |
| **C: ハイブリッド** | 新規cud/ + 既存utils拡張 | バランス良好 | 適度な複雑性 | **採用** |

## Design Decisions

### Decision: ディレクトリ構造（ハイブリッドアプローチ）

- **Context**: CUD機能のコード配置先決定
- **Alternatives Considered**:
  1. 既存accessibilityディレクトリに追加
  2. src/core/cud/に完全分離
  3. ハイブリッド（cud/ + utils拡張）
- **Selected Approach**: Option C（ハイブリッド）
- **Rationale**:
  - CUD固有ロジックは新規ディレクトリで分離
  - 汎用的なdeltaEokはcolor-space.tsに追加して再利用性向上
  - 循環依存を回避しつつ既存パターンを活用
- **Trade-offs**:
  - ✅ 責任分離が明確
  - ✅ テストが容易
  - ❌ 若干のファイル数増加
- **Follow-up**: import循環テストで依存関係を検証

### Decision: CVDシミュレーション拡張方式

- **Context**: 既存simulateCVDの戻り値拡張
- **Alternatives Considered**:
  1. 既存関数のシグネチャ変更（破壊的）
  2. 新規関数`simulateCvdWithFormats`追加（非破壊）
- **Selected Approach**: Option 2（新規関数追加）
- **Rationale**: 後方互換性を維持しつつ新形式を提供
- **Trade-offs**:
  - ✅ 既存コードへの影響なし
  - ❌ 2つの類似関数が存在
- **Follow-up**: 将来的に既存関数をdeprecate検討

### Decision: deltaE閾値の設定

- **Context**: CUD色との一致判定閾値
- **Alternatives Considered**:
  1. 単一閾値（0.05）
  2. 3段階閾値（0.03/0.06）
  3. 4段階閾値（0.02/0.04/0.08）
- **Selected Approach**: Option 2（3段階）
- **Rationale**:
  - ≤0.03: ほぼ一致（知覚的に同一）
  - 0.03-0.06: 近似（微差あり）
  - >0.06: 逸脱（明確に異なる）
- **Trade-offs**:
  - ✅ 実用的な分類
  - ❌ 閾値の知覚的妥当性は要検証
- **Follow-up**: ユーザーテストで閾値の適切性を確認

## Risks & Mitigations

- **OKLCH変換の精度差** — culori.jsに依存し一貫性を確保、ビルド時にスナップショットで検証
- **UI表示崩れ** — アコーディオン形式と最大表示件数制限で対応
- **循環依存** — 新規ディレクトリ分離とimport方向テストで防止
- **後方互換性** — 新規API追加のみ、既存関数は変更しない

## References

- [CUD推奨配色セット公式](https://jfly.uni-koeln.de/colorset/) — 20色の公式RGB値
- [CUDO（カラーユニバーサルデザイン機構）](https://cudo.jp/?page_id=1565) — CUDガイドライン
- [OKLab色空間](https://bottosson.github.io/posts/oklab/) — Björn OttossonによるOKLab仕様
- [Brettel 1997](https://vision.psychol.cam.ac.uk/jdmollon/papers/Brettel1997.pdf) — CVDシミュレーション行列の原典
