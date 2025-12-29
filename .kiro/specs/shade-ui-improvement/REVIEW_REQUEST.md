# Design Review Request: シェードUI改善 v2（再レビュー）

## レビュー対象

| ファイル | 状態 | 承認状況 |
|---------|------|---------|
| `requirements.md` | 更新済み（指摘対応済） | ✅ 承認済み |
| `design.md` | 更新済み（指摘対応済） | ⏳ レビュー待ち |
| `spec.json` | `design-generated`, tasks.generated=false | - |

---

## 前回レビュー指摘の対応状況

### 重大

| 指摘 | 対応 |
|------|------|
| 要件1.5と3.5の矛盾（バッジ表示制限 vs 全ロール表示） | ✅ 1.5を「内部的にはすべてのロールを保持（UI表示は要件2/3で定義）」に修正 |
| フェーズ/タスク整合（tasks.generated: true なのに旧タスク） | ✅ spec.json の tasks.generated を false に修正 |

### 中

| 指摘 | 対応 |
|------|------|
| 要件4.2/4.3が旧UI用語（ドット・バッジ） | ✅ 「円形スウォッチの中央ラベルと欄外ロール情報」に更新 |
| 要件5.2のDOM構造制限 | ✅ 3種類のDOM追加パターン（中央ラベル/欄外情報/境界インジケーター）を明記 |
| 短縮ラベル定義の型不整合（semantic vs success/error/warning） | ✅ `SemanticSubType`型を追加、`CATEGORY_SHORT_LABELS`と`SEMANTIC_SUBTYPE_LABELS`に分離 |

### 軽微

| 指摘 | 対応 |
|------|------|
| シーケンス図の不備 | ✅ SemanticRoleOverlay関与とブランドロール処理を追加、ContrastBoundaryCalculator/Indicatorを分離表記 |

### 確認事項への回答

| 質問 | 回答（明文化済み） |
|------|-------------------|
| 複数ロール時の中央ラベル優先順位 | 要件2.2に追記: Primary > Secondary > Accent > Semantic > Link |
| ブランドロールの円形化対象 | 要件2.6に追記: hue-scaleが特定できる場合は円形化対象、design.mdに「ブランドロールの扱い」セクション追加 |

---

## 第2回レビュー指摘の対応状況

### 中

| 指摘 | 対応 |
|------|------|
| 要件2.6がトレーサビリティ表・コンポーネント要件欄に未反映 | ✅ design.md:185に追加、CircularSwatchTransformerのRequirementsに2.6追加 |
| ARIA IDルールが不一致（swatch-brand-desc問題） | ✅ design.md:171-174に「ARIA IDルール」セクション追加、brand専用ID廃止を明記 |

### 軽微

| 指摘 | 対応 |
|------|------|
| トレーサビリティ表1.5要約が旧文言 | ✅ 「複数ロール保持（UI表示は要件2/3で定義）」に修正 |
| CVD色固定対象が不一致 | ✅ テスト戦略を「欄外ロール情報のカテゴリ色およびコントラスト境界ピルの色が固定されること」に統一 |

### 補足：要件2.2の短縮ラベル文言

| 指摘 | 対応 |
|------|------|
| 「先頭1文字」と例「Success→Su」が矛盾 | ✅ 要件2.2は「1-2文字」と正しく記載済み（修正不要） |

---

## 第3回レビュー指摘の対応状況

### 中

| 指摘 | 対応 |
|------|------|
| アクセシビリティ要件にswatch-brand-descが残存 | ✅ requirements.md:134-135を明確化: hue-scale特定可能時は「専用ID不使用」、不定時は「ARIA ID不要」 |
| RoleInfoItemのswatchElement必須でhue-scale不定ケースを表現不可 | ✅ design.md:457-460でscale/swatchElementを任意化、design.md:170で「コネクタ線なし、情報バー左端に配置」ルールを明記 |

### 軽微

| 指摘 | 対応 |
|------|------|
| トレーサビリティ4.3がコントラスト境界ピル色固定を未反映 | ✅ design.md:199に`ContrastBoundaryIndicator`を追加 |

---

## 第4回レビュー指摘の対応状況

### 中

| 指摘 | 対応 |
|------|------|
| applyOverlayの引数不一致（シーケンス図: 配列 vs インターフェース: 単数） | ✅ design.md:602を`roles: SemanticRole[]`に修正、シーケンス図と統一 |

---

## 変更概要

### 背景

初回実装（Task 1-5完了）後のレビューで、以下のUI改善要望が挙がった：

1. **ドットインジケーター問題**: 12pxの小さなドットでは視認性が低い
2. **バッジ見切れ問題**: オーバーレイバッジの「Link-Def...」のようなラベルが見切れる
3. **コントラスト情報の欠如**: WCAG準拠を確認するための視覚的指標がない

### 解決策（3つの主要変更）

#### 1. 円形スウォッチ変形（Requirement 2）

**Before**: スウォッチは四角形のまま、右上に12pxドットを追加
**After**: ロール割り当てスウォッチ自体を**円形に変形**し、中央にラベル表示

```
┌──────┐     ╭──────╮
│  ●   │ →   │  P   │
│ 500  │     ╰──────╯
└──────┘
```

- ラベル: P（Primary）、S（Secondary）、A（Accent）、E（Error）、W（Warning）、L（Link）
- 文字色は背景とのコントラストで自動調整（明→黒、暗→白）

#### 2. 欄外ロール情報表示（Requirement 3）

**Before**: スウォッチ内にオーバーレイバッジ（見切れ発生）
**After**: カラーパレット**下部に完全表示**

```
[ ● 50 ] [ ● 100 ] ... [ ◯ 500 ] [ ◯ 600 ] ... [ ● 1200 ]
                            │         │
                            ▼         ▼
                       [Primary]  [Accent-Blue]
```

- ロール名を見切れなく完全表示
- 円形スウォッチとの視覚的関連性（縦線コネクタ）
- カテゴリ色バッジ付き

#### 3. コントラスト比境界表示（Requirement 6 - 新規）

パレット下部に**WCAG準拠境界インジケーター**を追加：

```
White BG:  [3:1→]  [4.5:1→]
                                    [←4.5:1]  [←3:1]  :Black BG
```

| ピル | 意味 | スタイル |
|-----|------|---------|
| `3:1→` | 白背景に対して3:1以上の開始位置 | 白抜き |
| `4.5:1→` | 白背景に対して4.5:1以上の開始位置 | 白抜き |
| `←4.5:1` | 黒背景に対して4.5:1以上の終了位置 | 黒塗り |
| `←3:1` | 黒背景に対して3:1以上の終了位置 | 黒塗り |

---

## 設計上の重要ポイント

### アーキテクチャ変更

| 旧コンポーネント | 新コンポーネント | 理由 |
|----------------|----------------|------|
| `RoleDotIndicator` | `CircularSwatchTransformer` | スウォッチ自体を変形 |
| `RoleBadgeLabel`（オーバーレイ） | `ExternalRoleInfoBar` | 欄外に完全表示 |
| - | `ContrastBoundaryIndicator` | 新規追加 |
| - | `ContrastBoundaryCalculator` | 新規追加（Core層） |

### スタイリング方針

**原則**: インラインstyle属性を最小限にし、CSSクラスを優先使用

```css
/* 新規CSSクラス */
.dads-swatch--circular      /* 円形スウォッチ */
.dads-swatch__role-label    /* 中央ラベル */
.dads-role-info-bar         /* 欄外情報バー */
.dads-role-info-item        /* 個別ロール情報 */
.dads-role-connector        /* 接続線 */
.dads-contrast-boundary     /* 境界コンテナ */
.dads-contrast-pill         /* ピル共通 */
.dads-contrast-pill--outline /* 白抜き（白背景用） */
.dads-contrast-pill--filled /* 黒塗り（黒背景用） */
```

**インラインstyle許容ケース**:
- 動的に計算される背景色（`backgroundColor`）
- 動的に計算されるテキスト色（`color`）
- 位置調整（`left`/`transform`）

---

## レビュー観点

### 機能設計

- [ ] 円形スウォッチのサイズ・視認性は適切か
- [ ] 欄外ロール情報の配置・レイアウトは適切か
- [ ] コントラスト境界の表示位置・スタイルは分かりやすいか
- [ ] 既存CUDバッジとの共存に問題はないか

### 技術設計

- [ ] インターフェース定義は明確か
- [ ] 依存関係は適切か（UI層→Core層）
- [ ] CSSクラス命名規則は一貫しているか
- [ ] パフォーマンス目標（200ms）は妥当か

### 要件トレーサビリティ

- [ ] 全要件（1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.3, 5.1-5.2, 6.1-6.6）がカバーされているか
- [ ] テスト戦略は十分か

---

## 次のステップ

```
レビュー承認後:
/kiro:spec-tasks shade-ui-improvement -y
```

Tasks生成後、実装フェーズへ移行。

---

## 関連ファイル

- `.kiro/specs/shade-ui-improvement/requirements.md` - 要件定義
- `.kiro/specs/shade-ui-improvement/design.md` - 技術設計（本レビュー対象）
- `.kiro/specs/shade-ui-improvement/spec.json` - 仕様メタデータ
- `src/ui/semantic-role/` - 現行実装（置き換え対象）
