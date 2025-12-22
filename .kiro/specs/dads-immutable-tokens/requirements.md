# Requirements Document

## Introduction

本ドキュメントは、DADSカラートークンの不変性対応に関する要件を定義する。CUD-awareジェネレーターにおいて、DADSプリミティブカラー（50-1200スケール）を不変の基盤として保持しつつ、ブランドカラーとセマンティックカラーを派生トークンとして生成する機能を実装する。

**関連資料:**
- Design Doc: `docs/design/dads-immutable-tokens.md`
- Issue: [#11](https://github.com/monoharada/leonardo-learn/issues/11)

## Requirements

### Requirement 1: DADSトークン型定義

**Objective:** 開発者として、DADSプリミティブカラーを型安全かつ不変のデータ構造として表現したい。これにより、コンパイル時にDADSトークンの誤った変更を防止できる。

#### Acceptance Criteria

1. The Token Type System shall define `DadsToken` interface with readonly modifiers for all properties (`id`, `hex`, `nameJa`, `nameEn`, `classification`, `source`).

2. The Token Type System shall define `DadsColorHue` type representing 10 chromatic hues: `blue`, `light-blue`, `cyan`, `green`, `lime`, `yellow`, `orange`, `red`, `magenta`, `purple`.

3. The Token Type System shall define `DadsChromaScale` type for chromatic colors with values: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200.

4. The Token Type System shall define `DadsNeutralScale` type for neutral colors with additional values: 420, 536 (アクセシビリティ用中間値).

5. The Token Type System shall define `DadsColorCategory` type with values: `chromatic`, `neutral`, `semantic`.

6. When a DadsToken has an alpha value, the Token Type System shall store it in a separate `alpha` field (0-1範囲) while keeping `hex` in `#RRGGBB` format.

7. The Token Type System shall provide type guard functions `isDadsToken()` and `isBrandToken()` for discriminated union type checking.

### Requirement 2: DADSプリミティブインポート

**Objective:** 開発者として、@digital-go-jp/design-tokensのCSS変数からDADSプリミティブカラーを自動インポートしたい。これにより、DADSの公式定義との同期を維持できる。

#### Acceptance Criteria

1. When CSS text containing `--color-primitive-{hue}-{scale}` variables is provided, the Import Function shall parse and create DadsToken objects for each chromatic color.

2. When CSS text containing `--color-neutral-{white|black}` variables is provided, the Import Function shall create DadsToken objects with appropriate `nameJa` values.

3. When CSS text containing `--color-neutral-{solid|opacity}-gray-{scale}` variables is provided, the Import Function shall create DadsToken objects with correct scale classification.

4. When CSS text contains `rgba()` format values, the Import Function shall parse them into separate `hex` and `alpha` fields.

5. When CSS text containing `--color-semantic-{name}` variables with `var()` references is provided, the Import Function shall create DadsToken objects preserving the variable reference.

6. If rgba() parsing fails, the Import Function shall skip the entry and output a warning to console.

### Requirement 3: セマンティック参照解決

**Objective:** 開発者として、セマンティックトークンのvar()参照を実際のHEX値に解決したい。これにより、CUDマッピングや色計算が可能になる。

#### Acceptance Criteria

1. When a semantic token with `var(--color-primitive-{hue}-{scale})` format is provided, the Resolver shall return the corresponding primitive token's hex value.

2. If the referenced primitive token does not exist, the Resolver shall return `null`.

3. The Resolver shall be called before `enrichWithCudMapping()` to enable CUD distance calculation for semantic tokens.

### Requirement 4: CUDマッピング付加

**Objective:** 開発者として、各DADSトークンとCUD推奨20色との距離情報を取得したい。これにより、CUD互換性の判定が可能になる。

#### Acceptance Criteria

1. When DadsToken array and CudColor array are provided, the Enrichment Function shall calculate deltaE for each token to its nearest CUD color.

2. The Enrichment Function shall add `cudMapping` property to each token's classification with `nearestCudId` and `deltaE`.

3. If a token's hex does not start with `#` (var() reference), the Enrichment Function shall skip CUD mapping for that token.

### Requirement 5: ブランドトークン生成

**Objective:** 開発者として、ブランドカラーからDADS参照付きの派生トークンを生成したい。これにより、DADSとの関係を明示しながらプロダクト固有の色を定義できる。

#### Acceptance Criteria

1. The Brand Token Generator shall create `BrandToken` objects with `source: "brand"`, `hex`, and `dadsReference` properties.

2. The Brand Token Generator shall include `dadsReference` with: `tokenId`, `tokenHex`, `deltaE`, `derivationType`, and `zone`.

3. When the source DadsToken has an alpha value, the Brand Token Generator shall propagate `tokenAlpha` to `DadsReference`.

4. When generating a brand token with transparency, the Brand Token Generator shall store `alpha` as a separate field.

5. The Brand Token Generator shall preserve `originalHex` (最適化前の入力色) for traceability.

### Requirement 6: ブランドトークンID生成

**Objective:** 開発者として、一意で意味のあるブランドトークンIDを自動生成したい。これにより、命名規則の一貫性と衝突回避を実現できる。

#### Acceptance Criteria

1. The ID Generator shall produce IDs in format `brand-{namespace}-{role}-{shade}` or `brand-{role}-{shade}`.

2. When namespace is provided, the ID Generator shall include it in the ID.

3. When shade is not specified, the ID Generator shall default to 500.

4. When an ID already exists in `existingIds`, the ID Generator shall append numeric suffix (`-2`, `-3`, etc.) to ensure uniqueness.

5. The ID Generator shall sanitize input parts: lowercase conversion, space-to-hyphen, remove non-alphanumeric characters except hyphen.

### Requirement 7: Snapper出力拡張

**Objective:** 開発者として、Soft Snap結果にDADS派生情報を含めたい。これにより、下流のトークン生成に必要な情報を提供できる。

#### Acceptance Criteria

1. The Snapper shall extend `SoftSnapResult` interface with `derivation` property.

2. The `derivation` property shall include: `type` (DerivationType), `dadsTokenId`, `dadsTokenHex`, `brandTokenHex`.

3. While maintaining backward compatibility, the Snapper shall ensure existing properties (`hex`, `originalHex`, `cudColor`, `snapped`, `deltaE`, `zone`, `deltaEChange`, `explanation`) remain unchanged.

### Requirement 8: Optimizer出力拡張

**Objective:** 開発者として、最適化結果にブランドトークン生成に必要な全情報を含めたい。これにより、一貫したトークン生成フローを実現できる。

#### Acceptance Criteria

1. The Optimizer shall extend `OptimizedColor` interface with `brandToken` property.

2. The `brandToken` property shall include: `suggestedId` and `dadsReference`.

3. While maintaining backward compatibility, the Optimizer shall ensure existing properties (`hex`, `originalHex`, `zone`, `deltaE`, `snapped`, `cudTarget`) remain unchanged.

### Requirement 9: API v1/v2互換性

**Objective:** 開発者として、既存のv1 APIを維持しながら新しいv2 APIを利用したい。これにより、段階的な移行が可能になる。

#### Acceptance Criteria

1. The API Layer shall support `apiVersion` option with values `"v1"` or `"v2"`.

2. When `apiVersion` is `"v1"` or unspecified, the API Layer shall return `ProcessPaletteResultV1` with `palette: OptimizedColor[]`.

3. When `apiVersion` is `"v2"`, the API Layer shall return `ProcessPaletteResultV2` with `brandTokens: BrandToken[]` and `dadsReferences: Map<string, DadsToken>`.

4. The API Layer shall support `anchor` option with `anchorHex`, `anchorIndex`, and `isFixed` properties.

5. If `isFixed` is set to `false`, the API Layer shall output a warning and treat it as `true` (現在未実装のため).

6. When `generationContext` is provided in v2, the API Layer shall use it for brand token ID generation.

### Requirement 10: CSSエクスポートv2

**Objective:** 開発者として、DADSプリミティブとブランドトークンを明確に分離したCSSを出力したい。これにより、トークンの出自と不変性を維持できる。

#### Acceptance Criteria

1. The CSS Exporter shall output DADS primitives with `--dads-{color}` naming pattern and immutability comment.

2. The CSS Exporter shall output brand tokens with `--brand-{role}-{shade}` naming pattern and derivation comment.

3. When a token has an alpha value, the CSS Exporter shall output it in `rgba(R, G, B, alpha)` format.

4. When a token has no alpha value or alpha equals 1, the CSS Exporter shall output it in `#RRGGBB` format.

5. The CSS Exporter shall include derivation comments showing: referenced DADS token, deltaE, derivation type.

### Requirement 11: JSONエクスポートv2

**Objective:** 開発者として、機械可読なJSON形式でトークン関係を出力したい。これにより、ツール連携やドキュメント生成が可能になる。

#### Acceptance Criteria

1. The JSON Exporter shall output `dadsTokens` object with each token's `id`, `hex`, `nameJa`, `nameEn`, `source`, `immutable` properties.

2. When a DadsToken has alpha, the JSON Exporter shall include `alpha` property in output.

3. The JSON Exporter shall output `brandTokens` object with each token's `id`, `hex`, `source`, `originalHex`, `dadsReference` properties.

4. The `dadsReference` in JSON output shall include: `tokenId`, `tokenHex`, `tokenAlpha` (if applicable), `deltaE`, `derivationType`, `zone`.

5. The JSON Exporter shall output `cudSummary` with `complianceRate`, `mode`, `zoneDistribution`.

6. The JSON Exporter shall include `metadata` with `version`, `generatedAt`, `tokenSchema`.

### Requirement 12: UI保護ガードレール

**Objective:** ユーザーとして、DADSプリミティブカラーを誤って編集しようとした際に警告を受けたい。これにより、不変性原則の違反を防止できる。

#### Acceptance Criteria

1. When a user attempts to edit a DadsToken, the UI shall display a message: "DADSプリミティブカラーは変更できません".

2. When a user attempts to edit a DadsToken, the UI shall suggest: "独自の色が必要な場合は「ブランドトークンを作成」を選択してください".

3. The UI shall visually distinguish DADS tokens (参照専用) from Brand tokens (編集可能) with lock/edit icons.

4. While displaying DADS tokens, the UI shall disable edit controls and show read-only state.

### Requirement 13: マイグレーションユーティリティ

**Objective:** 開発者として、既存のv1形式出力をv2形式に変換したい。これにより、既存プロジェクトの移行を支援できる。

#### Acceptance Criteria

1. When OptimizedColor array is provided, the Migration Utility shall convert each to BrandToken format.

2. The Migration Utility shall return `MigrationResult` with: `brandTokens`, `warnings`, `unmigrated`.

3. If a color cannot be migrated (DADS参照特定不可など), the Migration Utility shall add it to `unmigrated` array.

4. The Migration Utility shall support `brandPrefix` and `roles` options for ID generation customization.

