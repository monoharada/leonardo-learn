# leonardo-learn

OKLCH色空間を使用したデザインシステム向けカラーパレット生成ツール（Adobe Leonardo inspired）

**🌐 [Live Demo](https://monoharada.github.io/leonardo-learn/)**

## 概要

**leonardo-learn**は、WCAGアクセシビリティ基準を満たしながら、ブランドカラーから完全なデザインシステムパレットを自動生成するツールです。Adobe Leonardoの優れた設計思想（コントラスト比駆動、3層アーキテクチャ）を継承しつつ、OKLCH色空間を採用することで、より自然な色遷移と広色域対応を実現します。

### 主な特徴

- ✅ **ハーモニーベース生成**: 色彩理論に基づくシステムパレット自動生成（補色、三色配色、類似色等）
- ✅ **OKLCH色空間**: Hue/Chromaを固定しLightnessのみで濃淡を生成、自然な色遷移
- ✅ **WCAGコンプライアンス**: WCAG 2.1/2.2およびWCAG 3（APCA）対応
- ✅ **デュアルコントラスト表示**: 白背景/黒背景両方のコントラストを一覧表示
- ✅ **コントラスト比駆動**: 目標コントラスト比から色を生成する逆引きアプローチ
- ✅ **キーカラー配置**: 13段階スケールでの正確なキーカラー配置（丸で表示）
- ✅ **インタラクティブ調整**: ドロワーUIで色を素早く切り替え・設定
- ✅ **コントラスト強度**: Subtle/Moderate/Strong/Vividの4段階
- ✅ **日本語ネイティブ**: UIとドキュメントを日本語で提供
- ✅ **低依存性**: ランタイム依存はculori.jsのみ

## 機能

### システムパレット生成

ブランドカラー1色から、以下の役割を持つ完全なパレットを自動生成：

| カテゴリ | 役割 | 生成方法 |
|----------|------|----------|
| **Primary** | ブランドの主色 | 入力色をそのまま使用 |
| **Secondary** | 補助色 | ハーモニータイプに基づく |
| **Accent** | アクセント色 | ハーモニータイプに基づく |
| **Gray/Slate** | ニュートラル | Primary色相、低彩度 |
| **Success/Warning/Error/Info** | セマンティック | 固定色相、Primary明度 |

### ハーモニータイプ

| タイプ | 説明 | Secondary | Accent |
|--------|------|-----------|--------|
| **Complementary** | 補色配色 | +180° | ±30° |
| **Triadic** | 三色配色 | +120° | +240° |
| **Analogous** | 類似色配色 | -30° | +30° |
| **Split-Complementary** | 分裂補色 | +150° | +210° |
| **Tetradic** | 四色配色 | +60° | +180°, +240° |
| **Square** | 正方形配色 | +90° | +180°, +270° |

### カラースケール生成

各パレット色から13段階のスケールを生成：
- **OKLCH準拠**: Hue/Chromaを固定し、Lightnessのみを変動
- **コントラスト比ベース**: 目標コントラスト比に基づいて各ステップを計算
- **キーカラー表示**: スケール内でキーカラーの位置を丸で強調

### アクセシビリティ表示

- **デュアルバッジ**: 白と黒それぞれに対するコントラストレベルを表示（AAA/AA/L）
- **テキスト色自動選択**: より高いコントラストの方を自動で推奨
- **詳細ドロワー**: WCAG/APCAコントラスト値、実際のテキストプレビュー

### インタラクティブUI

- **Palette/Shadesビュー**: 一覧表示と詳細スケール表示の切り替え
- **ミニスケール**: ドロワー内で色を素早く切り替え
- **キーカラー設定**: 選択した色をパレットの基準色に設定

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

### フェーズ1: コア機能 ✅
- [x] OKLCH色空間の基本操作ライブラリ統合
- [x] WCAGコントラスト比計算エンジン
- [x] 二分探索による色探索アルゴリズム
- [x] Colorクラス実装（skipClampオプション付き）
- [x] clampChroma実装（sRGBガマット内での色相保持）

### フェーズ2: パレット生成 ✅
- [x] Themeクラス設計
- [x] BackgroundColorクラス実装
- [x] スプライン補間による滑らかな色遷移
- [x] 13段階スケール生成
- [x] キーカラーの正確な配置機能

### フェーズ3: アクセシビリティ ✅
- [x] WCAG 2.1準拠の検証機能
- [x] APCA（WCAG 3）対応
- [x] コントラスト比の可視化
- [x] アクセシビリティレポート表示

### フェーズ4: UI/UX ✅
- [x] 日本語UI
- [x] リアルタイムプレビュー
- [x] パレット出力（CSS変数、JSON）
- [x] キーカラーのステップ選択機能
- [x] 明度分析による自動おすすめ機能

### フェーズ5: ハーモニー・システムパレット ✅
- [x] ハーモニータイプ選択（Complementary, Triadic, Analogous等）
- [x] ブランドカラーからシステムパレット自動生成
- [x] OKLCHベースのカラースケール（Hue/Chroma固定、Lightness可変）
- [x] Palette/Shadesビュー切り替え
- [x] 詳細ドロワー（ミニスケール付き）
- [x] 白/黒デュアルコントラストバッジ
- [x] キーカラー設定ボタン
- [x] コントラスト強度選択（Subtle/Moderate/Strong/Vivid）

### 今後の改善
- [ ] ダークモード対応（背景色切り替え）
- [ ] セマンティック色のカスタマイズ
- [ ] CSS変数/JSONエクスポート機能
- [ ] Figmaトークン出力
- [ ] プリセット保存・読み込み機能
- [ ] 複数パレットの同時編集

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
