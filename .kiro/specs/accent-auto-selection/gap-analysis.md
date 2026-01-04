# Implementation Gap Analysis: アクセントカラー自動選定

**作成日**: 2026-01-02
**フィーチャー**: accent-auto-selection
**ステータス**: 完了

---

## 1. 概要

ブランドカラーに対して相性の良いアクセントカラーをDADSシェードから自動選定する機能の実装ギャップ分析。

### 分析結果サマリー

| 項目 | 評価 |
|------|------|
| 既存資産再利用率 | 約40% |
| 工数見積 | M（3-7日） |
| リスク | Medium |
| 推奨アプローチ | Option B（新規コンポーネント作成） |

---

## 2. 要件-資産マッピング

| 要件エリア | 既存資産 | ギャップ | ステータス |
|-----------|----------|---------|------------|
| **Req 1: 候補生成** | `dads-data-provider.ts` (10色相×13ステップ=130色) | スコア計算・ソート機能なし | Missing |
| **Req 2: バランススコア計算** | | | |
| - ハーモニースコア | `harmony-score.ts#calculateHueDistanceScore()` | 完全再利用可能 | Exists |
| - CUDスコア | `cud/service.ts#findNearestCudColor()` | ΔE取得可能、正規化ロジック追加のみ | Partial |
| - コントラストスコア | `wcag.ts#getContrast()` | スコア化ロジック追加のみ | Partial |
| - 重み付け・正規化 | なし | 新規実装 | Missing |
| **Req 3: ハーモニーフィルタ** | なし | 色相フィルタロジック新規 | Missing |
| **Req 4: 選定UI** | なし | 新規コンポーネント | Missing |
| **Req 5: 手動調整** | `shades-view.ts` (DADSグリッド表示) | 選択・スコア表示追加 | Partial |
| **Req 6: パフォーマンス** | なし | メモ化ロジック新規 | Missing |
| **Req 7: エラー処理** | `loadDadsTokens()` (エラーハンドリング済) | エラー表示UI追加 | Partial |

---

## 3. 既存資産の詳細分析

### 3.1 再利用可能なコア関数

| 関数/モジュール | 場所 | 用途 | 再利用度 |
|----------------|------|------|---------|
| `calculateHueDistanceScore()` | `src/core/cud/harmony-score.ts:98` | 色相距離スコア計算 | 100% |
| `findNearestCudColor()` | `src/core/cud/service.ts:115` | CUD最近接色・ΔE取得 | 90% |
| `getContrast()` | `src/utils/wcag.ts:39` | WCAG 2.1コントラスト比 | 100% |
| `loadDadsTokens()` | `src/core/tokens/dads-data-provider.ts:128` | DADSトークン読込 | 100% |
| `getAllDadsChromatic()` | `src/core/tokens/dads-data-provider.ts:218` | 全10色相取得 | 100% |

### 3.2 状態管理

| 状態項目 | 場所 | アクセント選定での活用 |
|---------|------|----------------------|
| `state.lightBackgroundColor` | `src/ui/demo/state.ts:276` | コントラストスコア計算 |
| `state.darkBackgroundColor` | `src/ui/demo/state.ts:277` | コントラストスコア計算 |
| `state.palettes` | `src/ui/demo/state.ts:266` | アクセント追加先 |

### 3.3 UIパターン参照

| コンポーネント | 場所 | 参考にできる点 |
|---------------|------|---------------|
| `shades-view.ts` | `src/ui/demo/views/` | DADSグリッド表示 |
| `color-detail-modal.ts` | `src/ui/demo/` | モーダルパネル構造 |
| `background-color-selector.ts` | `src/ui/demo/` | 入力バリデーション |
| `cud-components.ts` | `src/ui/` | スコア表示パターン |

---

## 4. 実装アプローチオプション

### Option A: 既存コンポーネント拡張

**概要**: `shades-view.ts`を拡張してアクセント選定機能を追加

**対象ファイル**:
- `src/ui/demo/views/shades-view.ts` - スコア表示・選択機能追加
- `src/core/cud/harmony-score.ts` - 既存関数を活用

**トレードオフ**:
| Pros | Cons |
|------|------|
| 既存UIパターンを活用、開発工数削減 | shades-viewが肥大化するリスク |
| shades-viewの130色グリッドを再利用 | 責務の混在（閲覧と選定） |

---

### Option B: 新規コンポーネント作成 ⭐推奨

**概要**: `accent-selector/`ディレクトリを新設、専用サービス+UIを分離

**対象ファイル（新規）**:
```
src/core/accent/
  ├─ balance-score.ts      # バランススコア計算
  ├─ harmony-filter.ts     # ハーモニーフィルタ
  ├─ candidate-generator.ts # 候補生成
  └─ types.ts              # 型定義

src/ui/demo/accent-selector/
  ├─ index.ts              # エントリポイント
  ├─ candidate-card.ts     # 候補カード
  ├─ filter-controls.ts    # フィルタUI
  └─ weight-slider.ts      # 重み調整UI
```

**トレードオフ**:
| Pros | Cons |
|------|------|
| 単一責任の原則を遵守 | 新規ファイル数が多い |
| テストが書きやすい | 既存UIとの統合設計が必要 |
| 将来拡張が容易 | |

---

### Option C: ハイブリッド

**概要**: コアロジックは新規、UIはshades-viewを参考に新規コンポーネント

**フェーズ1**: コアロジック新規作成（`src/core/accent/`）
**フェーズ2**: UI新規作成、shades-viewのレンダリングパターン流用

**トレードオフ**:
| Pros | Cons |
|------|------|
| 段階的に開発可能 | 計画の複雑さ |
| コアとUIの責務分離 | |

---

## 5. 複雑度・リスク評価

| 項目 | 評価 | 理由 |
|------|------|------|
| **工数** | **M (3-7日)** | 既存関数再利用可能だが、UI新規作成・メモ化ロジックが必要 |
| **リスク** | **Medium** | 新規UIパターン、パフォーマンス要件(200ms)、重み正規化ロジック |

### リスク詳細

| リスク | 影響度 | 対策 |
|--------|-------|------|
| 130色計算が200msを超える | High | メモ化、Web Worker検討 |
| 重み正規化の端数処理バグ | Medium | 包括的なユニットテスト |
| UI統合時のstate競合 | Low | 既存パターン踏襲 |

---

## 6. 設計フェーズへの推奨事項

### 推奨アプローチ: Option B（新規コンポーネント作成）

**理由**:
1. 責務が明確（アクセント選定は独立した機能）
2. テスト可能性が高い
3. 将来の拡張（M3対応、プリセット保存）に対応しやすい

### 重要な設計決定事項

1. **スコア計算サービスの設計**
   - `calculateBalanceScore(candidate, brandColor, backgroundColor, weights)` のAPI設計
   - メモ化戦略（ブランドカラー+背景色+重みをキーにMap使用）

2. **UI統合ポイント**
   - アクセント選定パネルのトリガー方法（ボタン/モーダル）
   - 選択後の`state.palettes`への反映方法

3. **パフォーマンス対策**
   - 130色スコア計算の最適化
   - ハーモニーフィルタ時のスコア再利用

### Research Needed（設計フェーズで調査）

- [ ] 重み正規化の端数調整アルゴリズムの実装詳細
- [ ] メモ化キャッシュの無効化タイミングの設計
- [ ] UIコンポーネントのレンダリング最適化

---

## 7. 既存コード参照

### ハーモニースコア計算（再利用）

```typescript
// src/core/cud/harmony-score.ts:98
export const calculateHueDistanceScore = (
  anchorHex: string,
  paletteHexes: string[],
): number => {
  // 色相距離に基づくスコア計算（0-100）
  // 距離0→100点、距離180→0点に線形変換
};
```

### CUD距離計算（再利用）

```typescript
// src/core/cud/service.ts:115
export const findNearestCudColor = (hex: string): CudSearchResult => {
  // OKLab空間でのΔE計算
  // matchLevel: exact/near/moderate/off
};
```

### コントラスト計算（再利用）

```typescript
// src/utils/wcag.ts:39
export const getContrast = (
  color1: ColorObject,
  color2: ColorObject,
): number => {
  return wcagContrast(color1, color2); // WCAG 2.1コントラスト比 (1-21)
};
```

---

## 8. 次のステップ

1. **要件承認**: requirements.mdを確認・承認
2. **設計フェーズ**: `/kiro:spec-design accent-auto-selection -y`
3. **タスク分解**: `/kiro:spec-tasks accent-auto-selection`
4. **実装**: `/kiro:spec-impl accent-auto-selection`

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-02 | 初版作成 |
