# Technology Stack

## Architecture

**コントラスト比駆動の3層アーキテクチャ**:
- Theme層（統括）: 複数の色定義を管理し、テーマ全体を統括
- Color/BackgroundColor層（色定義）: 個別の色とそのスケールを定義
- アルゴリズム層（色生成）: コントラスト計算、二分探索、スプライン補間

この設計はAdobe Leonardoの優れたパターンを継承しつつ、OKLCH色空間に最適化。

## Core Technologies

- **Language**: TypeScript 5.3+ (strict mode必須)
- **Runtime**: Bun (Webスタンダード準拠、高速ビルド/テスト)
- **Color Library**: culori.js（OKLCH/OKLABネイティブサポート）- 唯一のランタイム依存
- **UI Framework**: Web Components / Vanilla TS（低依存性優先）または React 19（必要に応じて）

**設計方針**: Webスタンダード準拠、依存性最小化、静的解析による品質担保

## Key Libraries

### 色操作
- **culori.js**（推奨）: OKLCH/OKLAB/P3/Rec2020の広色域サポート、知覚的均一性
- または **chroma.js**: 実績豊富だがOKLCH拡張が必要

### UI/デザイン
- React 19（並行レンダリング、Suspense活用）
- Vite（高速な開発体験）

### テスト
- Vitest（ユニットテスト、Vite統合）
- Playwright（E2Eテスト、色の視覚的検証）

## Development Standards

### Type Safety
- TypeScript strict mode必須（`noImplicitAny`, `strictNullChecks`など全て有効）
- `any`型の使用禁止（`unknown`または適切な型定義）
- すべてのパブリックAPIにJSDoc記述

### Code Quality
- ESLint: TypeScript/React推奨ルール適用
- Prettier: セミコロンあり、シングルクォート、2スペースインデント
- コミット前の自動フォーマット（Husky + lint-staged想定）

### Testing
- ユニットテスト: Vitest、コアアルゴリズムは90%以上カバレッジ
- E2Eテスト: Playwright、主要ユースケース網羅
- 視覚的回帰テスト: 色パレット生成結果のスナップショット比較

## Development Environment

### Required Tools
- Bun 1.0+（ランタイム、パッケージマネージャー、テストランナー統合）
- TypeScript 5.3+
- Git 2.30+

### Common Commands
```bash
# 依存関係インストール
bun install

# 開発モード（ウォッチ）
bun run dev

# ビルド（ブラウザ向け最小化）
bun run build

# テスト実行
bun test

# テストウォッチモード
bun test --watch

# カバレッジ付きテスト（90%以上必須）
bun test --coverage

# 型チェック
bun run type-check

# リント
bun run lint

# リント自動修正
bun run lint:fix

# フォーマット
bun run format

# フォーマットチェック（CI用）
bun run format:check
```

## Key Technical Decisions

### ADR-001: OKLCH色空間の採用
**決定**: OKLCH/OKLABを第一色空間として採用（LCH/LAB/CAM02の代替）

**理由**:
- 知覚的均一性（lightness変化が視覚的に線形）
- 広色域対応（Display P3、Rec.2020）
- ブラウザネイティブサポート（CSS Color Level 4）

**トレードオフ**: culori.js依存またはchroma.js拡張の必要性

### ADR-002: コントラスト計算アルゴリズム
**決定**: WCAG 2.1標準輝度計算 + WCAG 3 APCA並行サポート

**理由**:
- WCAG 2.1は現行標準（法的要件）
- APCA（WCAG 3）は知覚的に正確で将来標準
- 両方サポートで移行期に対応

**実装**: 二分探索により目標コントラスト比に合致する色を効率的に探索（Adobe Leonardo方式）

### ADR-003: スケール生成精度
**決定**: 初期実装は1000点スケールでベンチマーク、必要に応じて調整

**理由**:
- Adobe Leonardoの3000点は計算コスト高
- 1000点で十分な精度が得られる可能性
- キャッシュ戦略で性能最適化

### ADR-004: 国際化（i18n）
**決定**: 日本語UIが第一優先、英語対応も視野に設計

**理由**:
- 主要ユーザーは日本語環境
- 将来的な多言語展開の可能性
- 数値フォーマット、日付の地域化を考慮

### ADR-005: ランタイム・ビルドツール（Bun採用）
**決定**: Bunを採用（Node.js互換性も維持）

**理由**:
- **Webスタンダード準拠**: Web API互換、ESM完全サポート
- **高速**: ビルド・テスト・インストールが高速
- **統合環境**: ランタイム + パッケージマネージャー + テストランナー
- **TypeScript/JSXネイティブサポート**: トランスパイル不要

**トレードオフ**:
- Bunはまだ比較的新しいツール（安定性リスク）
- Node.jsエコシステムとの互換性は高いが、一部ライブラリで問題の可能性
- 移行時のコストは低い（package.json互換）

### ADR-006: 品質ガードレール戦略
**決定**: TypeScript strict + ESLint + Prettier + Git Hooks（コミット時自動チェック）

**理由**:
- **TypeScript strict mode**: 型安全性の最大化（`any`型禁止、null厳格チェック）
- **ESLint**: コーディング規約の自動強制、潜在的バグの早期発見
- **Prettier**: フォーマットの一貫性、レビュー時の差分ノイズ削減
- **Git Hooks**: コミット前の自動チェックで品質ゲート設定

**実装**:
- `simple-git-hooks` + `nano-staged`（軽量な代替）
- コミット時に型チェック、リント、フォーマット、関連テストを自動実行
- CI/CDでカバレッジ90%以上を必須化

### ADR-007: CUD最適化アルゴリズムの設計
**決定**: 貪欲法ベースの多目的最適化 + 3段階ゾーン分類 + OKLab空間でのSoft Snap

**背景**:
CUD（カラーユニバーサルデザイン）対応パレット生成において、CUD推奨色との距離最小化とブランドカラーとの調和維持という2つの目標をバランスよく達成する必要がある。

**設計判断**:

#### 1. 最適化アルゴリズム: 貪欲法の採用
**検討した選択肢**:
- (A) 遺伝的アルゴリズム（GA）: 最適解に近い結果、計算コスト高
- (B) 焼きなまし法: 局所最適を回避可能、パラメータ調整が困難
- (C) 貪欲法: 計算コスト低、局所最適になる可能性

**選択**: (C) 貪欲法

**理由**:
- パフォーマンス要件（20色パレット200ms以内）を確実に達成
- CUD推奨色は20色と限定的であり、探索空間が小さい
- O(n×m) の計算量で十分高速（n=パレット色数、m=CUD色数）
- 将来的にGA等への拡張も可能な設計

#### 2. 目的関数: CUD距離 + 調和ペナルティ
**設計**:
```
objective = Σ(deltaE_i) + λ × (1 - harmonyScore/100)
```

**パラメータ**:
- `deltaE_i`: 各色のCUD推奨色との色差（OKLabベース）
- `λ`: 重み係数（0-1、デフォルト0.5、高いほどCUD優先）
- `harmonyScore`: 調和スコア（0-100）

**理由**:
- 単一スカラー値への集約で最適化が容易
- λによるCUD/調和のトレードオフ調整が可能
- 調和スコアを正規化（0-1）することで項間のバランスを確保

#### 3. ゾーン分類: 3段階閾値システム
**設計**:
- **Safe Zone** (ΔE ≤ 0.05): CUD推奨色と同等、スナップ不要
- **Warning Zone** (0.05 < ΔE ≤ 0.12): 許容範囲、ソフトスナップ適用可
- **Off Zone** (ΔE > 0.12): CUD非準拠、警告表示

**閾値の根拠**:
- ΔE=0.05: 人間の色知覚における識別閾値（JND: Just Noticeable Difference）付近
- ΔE=0.12: CUD推奨配色ver.4のMatchLevel (near/moderate) の境界に対応
- カスタム閾値対応で用途別調整が可能

#### 4. Soft Snap: OKLab空間での線形補間
**設計**:
```typescript
result_L = original_L + factor × (cudTarget_L - original_L)
result_a = original_a + factor × (cudTarget_a - original_a)
result_b = original_b + factor × (cudTarget_b - original_b)
```

**ゾーン別動作**:
- Safe Zone: スナップなし（元色を維持）
- Warning Zone: 戻り係数（0.0-1.0）による部分スナップ
- Off Zone: Warning境界までスナップ（完全CUD色への強制移動は行わない）

**理由**:
- OKLab空間は知覚的に均一で補間結果が自然
- 戻り係数でユーザーがスナップ強度を調整可能
- Off Zoneでも完全スナップしないことでブランドカラーを尊重

#### 5. 調和スコア: 3指標の加重平均
**設計**:
```
harmonyScore = w1 × hueScore + w2 × lightnessScore + w3 × contrastScore
```

**デフォルト重み**: hue=0.4, lightness=0.3, contrast=0.3

**各スコアの計算**:
- **色相スコア**: アンカーとの色相距離（円周上）を評価
- **明度分布スコア**: パレット内明度の標準偏差を評価（適度な分散が高スコア）
- **コントラストスコア**: アンカーとのWCAG AA適合率を評価

**理由**:
- 色相距離を重視（視覚的調和の主要因）
- 明度分布で視認性とバリエーションを確保
- コントラストでアクセシビリティ要件を満たす

**トレードオフ**:
- 貪欲法は大局的最適解を保証しない（許容範囲）
- 3指標は完全な調和評価ではない（将来的に拡張可能）
- Off Zoneの部分スナップはCUD完全準拠を保証しない（Strictモードで対応）

**関連ファイル**:
- `src/core/cud/optimizer.ts`: 最適化アルゴリズム
- `src/core/cud/zone.ts`: ゾーン分類
- `src/core/cud/harmony-score.ts`: 調和スコア計算
- `src/core/cud/snapper.ts`: Soft Snap実装

---
_Document standards and patterns, not every dependency_
