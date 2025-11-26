# 次回セッション: ハーモニー選択UX実装

## 前回セッションの成果

### 完了した作業
1. **DADS公式トークン完全移行**
   - 234箇所の`--dads-*`を公式形式に置換
   - tokens.css: @digital-go-jp/design-tokens v1.1.2準拠
   - Google Fonts (Noto Sans JP) 導入

2. **ファイル構成変更**
   - `global.css`: リンク4状態、フォーカススタイル統一
   - `utilities.css`: visually-hidden、タイポグラフィ
   - `app-components.css`: アプリ固有拡張用（空）

3. **UX設計書作成**
   - `docs/designs/harmony-selection-ux-redesign.md`
   - 人間中心設計に基づく再設計
   - WAI-ARIA準拠のタブUI仕様

### 残タスク
- [ ] Step 7: アプリ固有コンポーネント分離（dads- → app-）
- [ ] Step 8: ハイコントラストモード対応
- [ ] **UX実装**: ハーモニー選択UIの再設計実装

---

## 次回セッションで実行するプロンプト

```
ハーモニー選択UIの再設計を実装します。

設計書: docs/designs/harmony-selection-ux-redesign.md

以下の順序で進めてください:

### Phase 1: ナビゲーション構造変更
1. ヘッダーにHarmonyボタン追加
2. セグメントコントロールとの視覚的分離
3. 状態管理の追加（currentView: 'harmony' | 'palette' | 'shades' | 'a11y'）

### Phase 2: Harmony選択UI
1. ハーモニーカードコンポーネント作成（CSS + HTML）
2. カード内ミニプレビュー実装
3. カラーピッカー統合（input type="color"）
4. Generateボタン廃止

### Phase 3: 状態遷移実装
1. カード選択時の詳細ビュー遷移
2. Harmonyボタンでの起点復帰
3. フォーカス管理実装

### Phase 4: アクセシビリティ強化
1. タブUIのWAI-ARIA準拠
   - roving tabindex
   - aria-controls / aria-labelledby
   - キーボード操作（Arrow, Home, End）
2. スクリーンリーダー対応確認

各Phase完了後に表示確認を行ってください。
```

---

## 参照ファイル

| ファイル | 用途 |
|----------|------|
| `docs/designs/harmony-selection-ux-redesign.md` | 設計書（必読） |
| `src/ui/styles/components.css` | CSSスタイル |
| `src/ui/color-system-demo.ts` | メインUIロジック |
| `index.html` | HTMLテンプレート |

---

## 注意事項

- 即時フィードバックは避ける（明示的な選択アクションで確定）
- ネイティブ要素を活用（冗長なrole/aria-labelを避ける）
- タブUIはWAI-ARIA Authoring Practicesに準拠
