# Requirements Document

## Introduction

本仕様書は、改善版カラーシステム生成ロジックの要件を定義します。この機能は、役割別L/C調整、ニュートラルスケール、セマンティック衝突回避、Material Design/DADS風のシェード生成とロール割当を含む、より精度の高いOKLCHベースのデザインシステムカラーパレット生成機能を提供します。

### 主な目的

- デザインシステムで使用可能な、役割に応じた最適なLightness/Chroma調整
- ニュートラルカラー（グレースケール）の専用生成ロジック
- セマンティックカラー（primary、secondary、error等）間の色彩衝突を自動回避
- Material Design 3やDADS（Design for Accessibility Design System）に準拠したシェード生成

### 要件のスコープ

本要件書は以下の5つのレイヤーで構成されます：

1. **Core Color Engine** - 色生成の核となるロジック（R1〜R4）
2. **Accessibility & Role Layer** - アクセシビリティポリシーとロール割当（R5〜R6）
3. **Export & Tooling** - 外部ツールとの連携（R7）
4. **Preview UI** - リアルタイムプレビューと検証（R8）
5. **Performance & Reproducibility** - 実行性能と再現性（R9〜R10）

---

## Glossary / Parameter Ranges

本仕様書で使用する用語とパラメータ範囲の定義です。

### OKLCH色空間

- **Lightness (L)**: 0.0〜1.0（本仕様書では0%〜100%表記も使用、100% = 1.0）
- **Chroma (C)**: 0.0〜0.4（理論上は無制限だが、sRGB gamut内では概ね0.4以下）
- **Hue (H)**: 0°〜360°

### Chromaレベル定義

| レベル | Chroma範囲 | 用途例 |
|--------|------------|--------|
| 極低 | 0.00〜0.02 | ニュートラル、グレースケール |
| 低 | 0.02〜0.08 | サブデュードカラー、背景 |
| 中 | 0.08〜0.16 | secondary、tertiary |
| 高 | 0.16〜0.25 | primary、アクセント |
| 極高 | 0.25以上 | 強調、警告（gamut境界に注意） |

### Lightnessレベル定義

| レベル | Lightness範囲 | 用途例 |
|--------|---------------|--------|
| 極暗 | 0%〜20% | テキスト、アイコン（ライトモード） |
| 暗 | 20%〜40% | 強調テキスト、境界線 |
| 中 | 40%〜60% | primary色の中心帯 |
| 明 | 60%〜80% | サーフェス、コンテナ |
| 極明 | 80%〜100% | 背景（ライトモード） |

### 色差の単位

- **ΔH (Hue差)**: 度数（°）
- **ΔL (Lightness差)**: 0.0〜1.0または0%〜100%
- **ΔC (Chroma差)**: 0.0〜0.4
- **ΔE (色差)**: OKLCH空間でのユークリッド距離（許容誤差の目安: ΔE < 0.01）

### M3トーン値とLightnessの対応

Material Design 3のトーン値はOKLCH Lightnessに概ね対応します：
- トーン0 ≈ L0%、トーン50 ≈ L50%、トーン100 ≈ L100%
- 厳密なHCT→OKLCH変換では若干の差異が生じます（許容誤差: ΔE < 0.01）

---

## Requirements

### Core Color Engine

#### Requirement 1: 役割別Lightness/Chroma調整

**Objective:** デザイナーとして、カラーロール（primary、secondary、tertiary、error、warning、success等）に応じて自動的に最適なLightnessとChromaを調整できる機能が欲しい。これにより、各役割に適した視覚的階層と読みやすさを確保したパレットを効率的に作成できる。

##### Acceptance Criteria

1. When ユーザーがカラーロールを指定して色を生成する, the カラーシステム生成エンジン shall 指定されたロールに基づいて最適なLightness範囲を自動適用する
2. When primaryロールが指定された場合, the カラーシステム生成エンジン shall 高Chroma（0.16〜0.25）・中Lightness範囲（40%〜70%）でスケールを生成する
3. When secondaryロールが指定された場合, the カラーシステム生成エンジン shall 中Chroma（0.08〜0.16）・中Lightness範囲でスケールを生成する
4. When tertiaryロールが指定された場合, the カラーシステム生成エンジン shall 低〜中Chroma（0.06〜0.12）でアクセントとして機能するスケールを生成する
5. When errorロールが指定された場合, the カラーシステム生成エンジン shall 赤系（H: 15°〜45°）の高Chroma・高視認性を持つスケールを生成する
6. When warningロールが指定された場合, the カラーシステム生成エンジン shall 黄/オレンジ系（H: 60°〜90°）の中-高Chroma・高視認性を持つスケールを生成する
7. When successロールが指定された場合, the カラーシステム生成エンジン shall 緑系（H: 140°〜160°）の中Chroma・良好な視認性を持つスケールを生成する
8. While ロール別調整が適用されている間, the カラーシステム生成エンジン shall WCAGコントラスト比要件を維持する
9. The カラーシステム生成エンジン shall 各ロールのLightness/Chroma調整パラメータをカスタマイズ可能なAPIとして提供する

---

#### Requirement 2: ニュートラルスケール生成

**Objective:** デザイナーとして、テキスト、境界線、背景に最適化された高品質なニュートラルカラースケール（グレー系）を生成できる機能が欲しい。これにより、プライマリカラーと調和しつつ、読みやすさと視覚的階層を確保したグレースケールを効率的に作成できる。

##### Acceptance Criteria

1. When ユーザーがニュートラルスケールの生成を要求する, the カラーシステム生成エンジン shall 極低Chroma（0.00〜0.02）のグレースケールを生成する
2. When ベースカラーからニュートラルを生成する場合, the カラーシステム生成エンジン shall ベースカラーの色相を維持しながら極低Chromaのニュートラルを生成する（カラーハーモニー維持）
3. When ニュートラルスケールを生成する, the カラーシステム生成エンジン shall 11段階以上のシェード（50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950）を生成する
4. While ニュートラルスケールが生成されている間, the カラーシステム生成エンジン shall 隣接シェード間のLightness差を知覚的に均一に保つ
5. The カラーシステム生成エンジン shall ピュアグレー（無彩色、C=0）とウォームグレー/クールグレー（微小Chroma）の切り替えオプションを提供する
6. If ニュートラルスケールが指定されたLightness範囲（0%〜100%）を超える場合, then the カラーシステム生成エンジン shall 範囲を自動的にクランプし、ユーザーに警告を表示する

---

#### Requirement 3: セマンティック衝突回避

**Objective:** デザイナーとして、複数のセマンティックカラー（primary、error、warning等）間で視覚的に区別しにくい色の組み合わせを自動的に検出・回避できる機能が欲しい。これにより、アクセシビリティを確保しつつ、各セマンティックカラーが明確に識別可能なパレットを作成できる。

##### 衝突検出の閾値ルール

**ベース閾値**（すべての色ペアに適用）:
- ΔH < 30°: 色相が近すぎる警告
- ΔC < 0.05 かつ ΔL < 10%: 同一Lightness帯での類似性警告

**特定ペアの強化閾値**（自動調整対象）:
- primary vs error: ΔH < 45°で強い警告、代替提案を生成
- warning vs error: ΔH < 40°で強い警告、自動調整提案

**調整の制約**:
- Hue調整の最大許容量: ±30°
- 調整優先順位: 1) Chroma調整 → 2) Lightness調整 → 3) Hue調整
- 元の色の意図を最大限尊重し、最小限の調整を行う

##### Acceptance Criteria

1. When 複数のセマンティックカラーが定義される, the カラーシステム生成エンジン shall 各カラー間のΔHを計算し、ベース閾値（30°未満）の場合に衝突警告を生成する
2. When セマンティックカラー間でChromaとLightnessが類似している場合, the カラーシステム生成エンジン shall 同一Lightness帯での視覚的類似性を警告する
3. If primaryとerrorのΔHが45°未満の場合, then the カラーシステム生成エンジン shall 強い警告を表示し、代替色相を提案するかChromaによる差別化を推奨する
4. If warningとerrorのΔHが40°未満の場合, then the カラーシステム生成エンジン shall Hue（±30°以内）またはLightnessの調整を自動的に提案する
5. When 色覚多様性（CVD）モードが有効な場合, the カラーシステム生成エンジン shall Protanopia、Deuteranopia、Tritanopiaでの識別可能性を検証する
6. The カラーシステム生成エンジン shall 衝突検出の閾値（ΔH、ΔC、ΔL）をカスタマイズ可能にする
7. While 自動衝突回避が有効な間, the カラーシステム生成エンジン shall 調整優先順位（Chroma→Lightness→Hue）に従い、Hue調整は±30°以内に制限する

---

#### Requirement 4: Material Design 3準拠シェード生成

**Objective:** デザイナーとして、Material Design 3（M3）のカラーシステムに準拠したトーンスケール（Tonal Palette）を生成できる機能が欲しい。これにより、M3ベースのデザインシステムと互換性のあるカラーパレットを効率的に作成できる。

##### M3モードとDADSモードの関係

- **M3モードとDADSモードは重ねがけ可能**
- M3モードでトーンスケールを生成し、その上にDADSモードのアクセシビリティ最適化を適用できる
- 競合する場合はDADSモード（アクセシビリティ）が優先される

##### Acceptance Criteria

1. When Material Design 3モードでスケールを生成する, the カラーシステム生成エンジン shall 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100のトーン値（13段階）を持つスケールを生成する
2. When M3トーンスケールを生成する, the カラーシステム生成エンジン shall 各トーン値がOKLCH Lightnessに対応したスケールを生成する（許容誤差: ΔE < 0.01）
3. The カラーシステム生成エンジン shall M3のKey Colors（Primary、Secondary、Tertiary、Error、Neutral、Neutral Variant）を自動生成する
4. When ソースカラーからM3パレットを生成する, the カラーシステム生成エンジン shall HCT色空間からOKLCHへの変換を許容誤差ΔE < 0.01で行う
5. While M3モードが有効な間, the カラーシステム生成エンジン shall ライトテーマとダークテーマの両方に対応したトークンセットを生成する
6. The カラーシステム生成エンジン shall M3の Surface、Container、On-Color等のロール割当を自動計算する

---

### Accessibility & Role Layer

#### Requirement 5: DADSスタイルアクセシビリティ最適化

**Objective:** デザイナーとして、Design for Accessibility Design System（DADS）の原則に基づいた、アクセシビリティ最適化されたカラーパレットを生成できる機能が欲しい。これにより、WCAG AAA準拠やAPCA対応のハイコントラストなパレットを効率的に作成できる。

##### Acceptance Criteria

1. When DADSモードでスケールを生成する, the カラーシステム生成エンジン shall WCAG 2.1 AAAコントラスト比（7:1以上）を満たすテキストカラーを自動生成する
2. When DADSモードが有効な場合, the カラーシステム生成エンジン shall APCA（Lc値）に基づいたコントラスト計算を並行して実行する
3. The カラーシステム生成エンジン shall 各シェードに対して推奨される用途（テキスト、背景、境界線、アイコン等）を自動割当する
4. While DADSモードが有効な間, the カラーシステム生成エンジン shall 大文字テキスト、小文字テキスト、非テキスト要素それぞれに適切なコントラスト基準を適用する
5. If 生成されたカラーがWCAG AAA基準を満たさない場合, then the カラーシステム生成エンジン shall 自動的にLightnessを調整して基準を満たすよう修正する
6. The カラーシステム生成エンジン shall フォーカスインジケーター、エラー状態、選択状態などのインタラクティブ状態用カラーを自動生成する

---

#### Requirement 6: ロール自動割当

**Objective:** デザイナーとして、生成されたシェードに対してデザインシステムでの推奨用途（ボタン背景、テキスト、境界線等）を自動的に割り当てる機能が欲しい。これにより、各シェードの適切な使用法を即座に把握し、一貫性のあるデザイン実装を促進できる。

##### Acceptance Criteria

1. When シェードスケールが生成される, the カラーシステム生成エンジン shall 各シェードに対してプライマリ用途とセカンダリ用途を自動割当する
2. The カラーシステム生成エンジン shall 以下のロールカテゴリを提供する: background、surface、container、text、icon、border、focus、hover、active、disabled
3. When Lightness値が80%以上（極明）のシェードが生成される, the カラーシステム生成エンジン shall そのシェードをbackground/surface用途として推奨する
4. When Lightness値が20%以下（極暗）のシェードが生成される, the カラーシステム生成エンジン shall そのシェードをtext/icon用途として推奨する
5. While ロール割当が実行される間, the カラーシステム生成エンジン shall 背景色と前景色の組み合わせでWCAGコントラスト比を検証する
6. The カラーシステム生成エンジン shall カスタムロール定義の追加とデフォルトロールの上書きを許可する

---

### Export & Tooling

#### Requirement 7: 出力フォーマットとエクスポート

**Objective:** 開発者として、生成されたカラーシステムを様々なフォーマット（CSS変数、Design Tokens、Tailwind設定等）でエクスポートできる機能が欲しい。これにより、既存のワークフローやツールチェーンとの統合を効率化できる。

##### エクスポートフォーマット例

**CSS Custom Properties:**
```css
:root {
  /* Semantic tokens */
  --color-primary-500: oklch(0.65 0.2 250);
  --color-primary-500-srgb: #4a7dff; /* fallback */

  /* Alias tokens */
  --color-button-bg: var(--color-primary-500);
}
```

**W3C Design Tokens (DTCG):**
```json
{
  "color": {
    "primary": {
      "500": {
        "$value": "oklch(0.65 0.2 250)",
        "$type": "color",
        "$description": "Primary brand color"
      }
    }
  },
  "semantic": {
    "button": {
      "background": {
        "$value": "{color.primary.500}",
        "$type": "color"
      }
    }
  }
}
```

**Tailwind CSS設定:**
```javascript
// theme.extend.colors に追加
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'oklch(0.97 0.02 250)',
          // ...
          500: 'oklch(0.65 0.2 250)',
          // ...
          950: 'oklch(0.15 0.1 250)',
        }
      }
    }
  }
}
```

##### Acceptance Criteria

1. The カラーシステム生成エンジン shall CSS Custom Properties形式でのエクスポートをサポートする（OKLCH値 + sRGB fallback）
2. The カラーシステム生成エンジン shall W3C Design Tokens（DTCG）形式でのエクスポートをサポートし、semanticトークンとaliasトークンを分離する
3. The カラーシステム生成エンジン shall Tailwind CSS設定形式（theme.extend.colors）でのエクスポートをサポートする
4. The カラーシステム生成エンジン shall JSON形式でのraw dataエクスポートをサポートする
5. When エクスポートを実行する, the カラーシステム生成エンジン shall OKLCH、sRGB、Display P3形式で色値を提供する
6. While エクスポートが実行される間, the カラーシステム生成エンジン shall セマンティックトークン名（--color-primary-500等）を自動生成する
7. Where 広色域ディスプレイサポートが必要な場合, the カラーシステム生成エンジン shall @supportsによるfallback付きcolor()関数形式でエクスポートする

---

### Preview UI

#### Requirement 8: リアルタイムプレビューと検証

**Objective:** デザイナーとして、生成されたカラーシステムをリアルタイムでプレビューし、アクセシビリティ要件を即座に検証できる機能が欲しい。これにより、調整とフィードバックのサイクルを高速化し、最適なパレットを効率的に作成できる。

##### Acceptance Criteria

1. When カラーパラメータが変更される, the カラーシステム生成エンジン shall 100ms以内（目標値）にプレビューを更新する
2. The カラーシステム生成エンジン shall 生成されたスケール全体の視覚的プレビューを提供する
3. While プレビューが表示されている間, the カラーシステム生成エンジン shall 各シェードのWCAG AA/AAA準拠状態をインジケーターで表示する
4. When ユーザーが特定のシェードを選択する, the カラーシステム生成エンジン shall そのシェードの詳細情報（OKLCH値、コントラスト比、推奨用途）を表示する
5. The カラーシステム生成エンジン shall ライトモード/ダークモードのプレビュー切り替えを提供する
6. If アクセシビリティ違反が検出された場合, then the カラーシステム生成エンジン shall 該当箇所をハイライトし、修正提案を表示する

---

### Performance & Reproducibility

#### Requirement 9: パフォーマンスと最適化

**Objective:** 開発者として、大規模なカラーシステム（複数のカラーロール × 多数のシェード）を高速に生成できる機能が欲しい。これにより、反復的なデザイン探索と本番環境での使用の両方で優れたパフォーマンスを確保できる。

##### パフォーマンス目標

以下は推奨目標値です。ターゲット環境（モダンブラウザ、M1 Mac相当）での測定を前提とします：

- 単一スケール（13シェード）: 50ms以内
- 完全テーマ（6ロール × 13シェード）: 300ms以内

##### Acceptance Criteria

1. The カラーシステム生成エンジン shall 1つのカラーロールのフルスケール（13シェード）を50ms以内（推奨目標）に生成する
2. The カラーシステム生成エンジン shall 完全なテーマ（6ロール × 13シェード）を300ms以内（推奨目標）に生成する
3. While 複数のスケールを生成する間, the カラーシステム生成エンジン shall 並列処理を活用して生成時間を最適化する
4. The カラーシステム生成エンジン shall 生成結果をキャッシュし、同一パラメータでの再生成を即座に返す
5. When 部分的なパラメータ変更が行われた場合, the カラーシステム生成エンジン shall 差分のみを再計算する増分更新を行う
6. The カラーシステム生成エンジン shall UIスレッドをブロックしない非同期生成をサポートする（実装手段は問わない）

---

#### Requirement 10: バージョニングと再現性

**Objective:** 開発者として、生成されたカラーシステムの入力パラメータを保存し、同じ設定から完全に同一のパレットを再生成できる機能が欲しい。これにより、デザインの履歴管理、差分比較、チーム間での共有を効率化できる。

##### Acceptance Criteria

1. The カラーシステム生成エンジン shall 生成に使用したすべての入力パラメータ（ベースカラー、ロール設定、モード、閾値等）をJSONとして保存できる
2. When 保存されたパラメータセットが読み込まれる, the カラーシステム生成エンジン shall 完全に同一のカラーパレットを再生成する（決定論的生成）
3. The カラーシステム生成エンジン shall パラメータセットにバージョン番号とタイムスタンプを付与する
4. When 2つのパラメータセットが比較される, the カラーシステム生成エンジン shall 差分のあるパラメータを一覧表示する
5. The カラーシステム生成エンジン shall パラメータセットのインポート/エクスポート機能を提供する
6. While パラメータセットが保存される間, the カラーシステム生成エンジン shall エンジンのバージョン情報も記録し、互換性を検証できるようにする

---

#### Requirement 11: 色覚シミュレーションと識別性検証

**Objective:** デザイナーとして、生成したカラーパレットが様々な色覚特性を持つユーザーにとって識別可能かどうかを検証できる機能が欲しい。これにより、色覚多様性に配慮したインクルーシブなデザインシステムを構築できる。

##### Acceptance Criteria

1. When ユーザーが色覚シミュレーションを要求する, the カラーシステム生成エンジン shall Protanopia（1型2色覚）、Deuteranopia（2型2色覚）、Tritanopia（3型2色覚）、Achromatopsia（全色盲）のシミュレーションを提供する
2. The カラーシステム生成エンジン shall 各色覚タイプに対してBrettel 1997法またはMachado 2009法に基づいた正確な色変換を行う
3. When パレット内の色ペアの識別性を検証する, the カラーシステム生成エンジン shall 各色覚タイプでシミュレーション後の色差（ΔE）を計算する
4. The カラーシステム生成エンジン shall シミュレーション後の色差が閾値（ΔE < 3.0）以下の色ペアを「識別困難」として警告する
5. When 識別困難な色ペアが検出された, the カラーシステム生成エンジン shall 問題のある色ペアと該当する色覚タイプを一覧表示する
6. The カラーシステム生成エンジン shall 隣接するシェード間、および同一ロール内の重要な色ペア（例：背景色とテキスト色）の識別性を優先的に検証する
7. When 識別困難な色ペアが検出された, the カラーシステム生成エンジン shall Hue、Lightness、またはChromaの調整による改善提案を生成する
8. The カラーシステム生成エンジン shall パレット全体の「CVDスコア」（色覚アクセシビリティスコア）を0〜100で計算し表示する
9. The カラーシステム生成エンジン shall シミュレーション結果をプレビューUIに反映し、各色覚タイプでの見え方を視覚的に確認できるようにする
