# leonardo-learn

OKLCH色空間を使用したデザインシステム向けカラーパレット生成ツール（Adobe Leonardo inspired）

**[Live Demo](https://monoharada.github.io/leonardo-learn/)**

## 概要

**leonardo-learn**は、WCAGアクセシビリティ基準を満たしながら、ブランドカラーから完全なデザインシステムパレットを自動生成するツールです。Adobe Leonardoの優れた設計思想（コントラスト比駆動、3層アーキテクチャ）を継承しつつ、OKLCH色空間を採用することで、より自然な色遷移と広色域対応を実現します。

### 主な特徴

- **ハーモニーベース生成**: 色彩理論に基づくシステムパレット自動生成（補色、三色配色、類似色等）
- **OKLCH色空間**: Hue/Chromaを固定しLightnessのみで濃淡を生成、自然な色遷移
- **WCAGコンプライアンス**: WCAG 2.1/2.2およびWCAG 3（APCA）対応
- **CUD対応**: 色覚多様性に配慮したCUD推奨配色セット ver.4（20色）統合
- **CVDシミュレーション**: P型/D型/T型色覚のシミュレーションと混同リスク検証
- **デュアルコントラスト表示**: 白背景/黒背景両方のコントラストを一覧表示
- **日本語ネイティブ**: UIとドキュメントを日本語で提供

---

## CUD（カラーユニバーサルデザイン）機能

### CUD推奨配色セット ver.4

色覚多様性に配慮した20色の推奨配色セットを完全サポート：

| カテゴリ | 色数 | 用途 |
|---------|------|------|
| **アクセント色** | 9色 | 赤、黄、緑、青、空色、ピンク、オレンジ、紫、茶 |
| **ベース色** | 7色 | 明るい系（ピンク、クリーム、黄緑、水色）、暗い系（ベージュ、緑、青緑） |
| **無彩色** | 4色 | 白、明るいグレー、グレー、黒 |

### CUDサブモード

ハーモニービューでCUDサブモードを有効化すると：

1. **CUDバッジ表示**: 各色にCUD適合度バッジを表示
   - `CUD` (緑): CUD推奨色と完全一致
   - `≈CUD` (橙): CUD推奨色に近い
   - `!CUD` (灰): CUD推奨色セット外

2. **パレット検証**: 6種類の自動チェック
   - CUDセット外の色検出
   - コントラスト比不足（4.5:1/7:1）
   - CVD混同リスク検出
   - 類似色の警告
   - 黄緑/黄の混同リスク
   - 推奨例との比較

3. **CVD混同リスク分析**: アクセシビリティビューで詳細分析
   - P型（1型）/D型（2型）/T型（3型）シミュレーション
   - 隣接色の識別困難度を自動検出

### 使用方法

```
1. ハーモニービューを開く
2. 「CUDサブモードを有効化」チェックボックスをON
3. CUD推奨配色ガイドとバッジが表示される
4. パレットビューで検証結果を確認
5. アクセシビリティビューでCVD混同リスクを詳細分析
```

---

## システムパレット生成

ブランドカラー1色から、以下の役割を持つ完全なパレットを自動生成：

| カテゴリ | 役割 | 生成方法 |
|----------|------|----------|
| **Primary** | ブランドの主色 | 入力色をそのまま使用 |
| **Secondary** | 補助色 | ハーモニータイプに基づく |
| **Accent** | アクセント色 | ハーモニータイプに基づく |
| **Gray/Slate** | ニュートラル | Primary色相、低彩度 |
| **Success/Warning/Error/Info** | セマンティック | 固定色相、Primary明度 |

### ハーモニータイプ

| タイプ | 説明 | 色数 |
|--------|------|------|
| **Complementary** | 補色配色 | 2色 |
| **Triadic** | 三色配色 | 3色 |
| **Analogous** | 類似色配色 | 3色 |
| **Split-Complementary** | 分裂補色 | 3色 |
| **Tetradic** | 四色配色 | 4色 |
| **Square** | 正方形配色 | 4色 |
| **Material 3** | Google M3スタイル | 5色 |
| **DADS** | 12色相セマンティック | 12色+ |

---

## アクセシビリティ機能

### WCAGコントラスト検証

- **WCAG 2.1/2.2**: AA (4.5:1) / AAA (7:1) レベル判定
- **WCAG 3 (APCA)**: 知覚コントラストアルゴリズム対応
- **デュアルバッジ**: 白/黒背景それぞれのコントラストレベル表示

### CVDシミュレーション

| タイプ | 説明 | 影響 |
|--------|------|------|
| **Protan (P型)** | 1型色覚 | 赤の感度低下 |
| **Deutan (D型)** | 2型色覚 | 緑の感度低下 |
| **Tritan (T型)** | 3型色覚 | 青の感度低下 |

### 識別性チェック

- 隣接色のDeltaE（色差）計算
- CVDシミュレーション後の識別困難ペア検出
- 警告アイコンによる問題箇所の可視化

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Runtime** | Bun 1.0+ |
| **Language** | TypeScript 5.3+ (strict mode) |
| **Color Library** | culori.js (OKLCH/OKLABネイティブ) |
| **Testing** | Bun Test (544テスト) |
| **Linting** | ESLint + Prettier |

---

## セットアップ

### 必要要件

- [Bun](https://bun.sh/) 1.0以上

### インストール

```bash
git clone https://github.com/monoharada/leonardo-learn.git
cd leonardo-learn
bun install
bun run prepare  # Git Hooksセットアップ
```

### 開発コマンド

```bash
bun run dev         # 開発モード（ウォッチ）
bun run build       # ビルド
bun test            # テスト実行
bun run type-check  # 型チェック
bun run lint        # リント
bun run format      # フォーマット
```

---

## プロジェクト構造

```
leonardo-learn/
├─ src/
│  ├─ core/
│  │  ├─ cud/           # CUD機能（colors, service, classifier, cvd, validator）
│  │  ├─ export/        # エクスポート（CSS, JSON, Tailwind）
│  │  ├─ color.ts       # Colorクラス
│  │  ├─ harmony.ts     # ハーモニー生成
│  │  └─ solver.ts      # コントラスト計算
│  ├─ accessibility/    # WCAG/APCA/CVDシミュレーション
│  ├─ utils/            # OKLCH色空間操作
│  └─ ui/               # UIコンポーネント（demo.ts, cud-components.ts）
├─ tests/               # テストファイル
└─ docs/                # ドキュメント
```

---

## 実装フェーズ

### フェーズ1-5: コア機能・パレット・アクセシビリティ・UI・ハーモニー ✅

完了済み（詳細は省略）

### フェーズ6: CUD色統合 ✅ **NEW**

- [x] CUD推奨配色セット ver.4（20色）データベース
- [x] 色検索API（完全一致・最近接色検索）
- [x] 色分類器（9色相クラスター、4明度バケット）
- [x] CVDシミュレーター拡張（protan/deutan/tritan）
- [x] パレット検証エンジン（6種類チェック）
- [x] UI統合（CUDバッジ、診断パネル、サブモード）
- [x] アクセシビリティビュー統合（CVD混同リスク分析）
- [x] エクスポート拡張（CUDメタデータオプション）

### 今後の改善

- [ ] ダークモード対応
- [ ] Figmaトークン出力
- [ ] E2Eテスト（Playwright）
- [ ] プリセット保存・読み込み

---

## 参考資料

- [Adobe Leonardo](https://github.com/adobe/leonardo) - 元プロジェクト
- [OKLCH色空間](https://oklch.com/)
- [CUD推奨配色セット](https://jfly.uni-koeln.de/colorset/) - カラーユニバーサルデザイン
- [APCA (WCAG 3)](https://github.com/Myndex/apca-w3)
- [culori.js](https://culorijs.org/)

---

## ライセンス

MIT License

## 貢献

プルリクエスト歓迎！詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。
