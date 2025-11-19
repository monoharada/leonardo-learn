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

---
_Document standards and patterns, not every dependency_
