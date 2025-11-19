# leonardo-learn

OKLCH色空間を使用したデザインシステム向けカラーパレット生成ツール（Adobe Leonardo inspired）

## 概要

**leonardo-learn**は、WCAGアクセシビリティ基準を満たしながら、知覚的に均一な色パレットを生成するツールです。Adobe Leonardoの優れた設計思想（コントラスト比駆動、3層アーキテクチャ）を継承しつつ、OKLCH色空間を採用することで、より自然な色遷移と広色域対応を実現します。

### 主な特徴

- ✅ **OKLCH色空間**: 知覚的に均一な色空間により自然な色遷移
- ✅ **WCAGコンプライアンス**: WCAG 2.1/2.2およびWCAG 3（APCA）対応
- ✅ **コントラスト比駆動**: 目標コントラスト比から色を生成する逆引きアプローチ
- ✅ **日本語ネイティブ**: UIとドキュメントを日本語で提供
- ✅ **低依存性**: ランタイム依存はculori.jsのみ
- ✅ **Webスタンダード準拠**: Bun + TypeScript + ESM

## 技術スタック

- **Runtime**: Bun 1.0+
- **Language**: TypeScript 5.3+ (strict mode)
- **Color Library**: culori.js (OKLCH/OKLABネイティブサポート)
- **Testing**: Bun Test (ビルトインテストランナー)
- **Linting**: ESLint + Prettier + Git Hooks

## セットアップ

### 必要要件

- [Bun](https://bun.sh/) 1.0以上

### インストール

```bash
# リポジトリクローン
git clone https://github.com/monoharada/leonardo-learn.git
cd leonardo-learn

# 依存関係インストール
bun install

# Git Hooksセットアップ
bun run prepare
```

## 開発コマンド

```bash
# 開発モード（ウォッチ）
bun run dev

# ビルド
bun run build

# テスト実行
bun test

# テストウォッチモード
bun test --watch

# カバレッジ付きテスト
bun test --coverage

# 型チェック
bun run type-check

# リント
bun run lint

# リント自動修正
bun run lint:fix

# フォーマット
bun run format

# フォーマットチェック
bun run format:check
```

## プロジェクト構造

```
leonardo-learn/
├─ src/
│  ├─ core/          # 色生成コアロジック（Theme/Color/Background）
│  ├─ utils/         # OKLCH色空間操作、WCAG計算
│  └─ ui/            # UIコンポーネント（将来実装）
├─ tests/            # テストファイル
├─ docs/
│  └─ reference/     # Adobe Leonardo分析など
├─ .kiro/
│  ├─ steering/      # プロジェクト設計方針
│  └─ specs/         # 機能仕様（Spec-Driven Development）
└─ CLAUDE.md         # Claude Code向けガイド
```

## 実装フェーズ

### フェーズ1: コア機能（進行中）
- [ ] OKLCH色空間の基本操作ライブラリ統合
- [ ] WCAGコントラスト比計算エンジン
- [ ] 二分探索による色探索アルゴリズム
- [ ] 基本的なColorクラス実装

### フェーズ2: パレット生成
- [ ] Themeクラス設計
- [ ] BackgroundColorクラス実装
- [ ] スプライン補間による滑らかな色遷移
- [ ] スケール生成（1000点スケールで開始）

### フェーズ3: アクセシビリティ
- [ ] WCAG 2.1準拠の検証機能
- [ ] APCA（WCAG 3）対応
- [ ] 日本語フォントでの視認性検証
- [ ] アクセシビリティレポート生成

### フェーズ4: UI/UX
- [ ] 日本語UI
- [ ] リアルタイムプレビュー
- [ ] パレット出力（CSS変数、JSON、Figmaトークン等）
- [ ] プリセット管理

## 品質基準

- **型安全性**: すべてのコードにTypeScript型定義
- **テストカバレッジ**: コアアルゴリズムは90%以上
- **アクセシビリティ**: WCAG 2.2 AA準拠を必須
- **パフォーマンス**: パレット生成は1秒以内
- **ドキュメント**: すべてのパブリックAPIにJSDoc

## 参考資料

- 元プロジェクト: [Adobe Leonardo](https://github.com/adobe/leonardo)
- OKLCH色空間: [oklch.com](https://oklch.com/)
- WCAG 3 (APCA): [APCA GitHub](https://github.com/Myndex/apca-w3)
- culori.js: [culorijs.org](https://culorijs.org/)

## ライセンス

MIT License

## 貢献

プルリクエスト歓迎！詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。
