# Requirements Document: 背景色変更機能

## Introduction

パレット画面およびシェード画面で、背景色を自由に変更できる機能を追加する。背景色の変更に伴い、すべてのコントラスト値をリアルタイムで再計算する。

**目的**: 実際のUIで使用する背景色に対して、パレットの色がどのように見えるか、コントラスト要件を満たすかを確認できるようにする。

**選択方法**: カラーピッカー（任意の色を選択可能）

---

## Requirements

### Requirement 1: 背景色選択UI

**Objective:** As a デザイナー, I want 背景色を自由に選択したい, so that 実際の使用環境でパレットを確認できる

#### Acceptance Criteria

1. The システム shall パレット画面とシェード画面にそれぞれ背景色セレクターを表示する
2. The システム shall 以下の入力方法を提供する:
   - カラーピッカー（視覚的な色選択）
   - HEX入力フィールド（#RRGGBB形式）
3. The システム shall 背景色セレクター内に「詳細モード」切替を表示する。When ユーザーが詳細モードをONにした時, the システム shall OKLCH入力フィールドを表示し、OFFの時は非表示にする。初期状態はOFFとする
4. The システム shall HEX入力を `^#[0-9A-Fa-f]{6}$` のみ許可する。The システム shall OKLCH入力を L:0.0–1.0, C:0.0–0.4, H:0–360（度）に制限し、範囲外またはNaNは無効としてエラー表示し前値を保持する
5. When 無効な色値が入力された時, the システム shall エラーメッセージを表示し、前の有効な値を維持する
6. The システム shall 現在選択中の背景色をプレビュー表示する

---

### Requirement 2: プリセット背景色

**Objective:** As a デザイナー, I want よく使う背景色にすばやくアクセスしたい, so that 効率的に切り替えられる

#### Acceptance Criteria

1. The システム shall 以下のプリセット背景色を提供する:
   - White (#ffffff) - デフォルト
   - Light Gray (#f8fafc)
   - Dark Gray (#18181b)
   - Black (#000000)
2. When プリセットボタンをクリックした時, the システム shall 即座にその背景色を適用する
3. The システム shall 各プリセットにモード（light/dark）を関連付け、テキスト色の自動切り替えに使用する
4. Where カスタム背景色が選択されている時, the システム shall OKLCHのL値（明度）でモードを自動判定する（L > 0.5 → light）
5. The システム shall sRGB入力（HEX/カラーピッカー）をD65のOKLCHへ変換してL値を算出する（CSS Color 4の定義に準拠）

---

### Requirement 3: コントラスト再計算

**Objective:** As a デザイナー, I want 背景色変更時にコントラスト値が自動更新されてほしい, so that 正確なアクセシビリティ情報を得られる

#### Acceptance Criteria

1. When 背景色が変更された時, the システム shall すべてのパレット色と新しい背景色とのコントラスト比を再計算する
2. The システム shall WCAG 2.1コントラスト比とAPCAコントラスト値の両方を更新する
3. The システム shall AAA/AA/LバッジをWCAG 2.1コントラスト比（通常テキスト）で判定する: AAA≥7.0, AA≥4.5, L≥3.0。APCAは数値(Lc)のみ表示しバッジ判定には使用しない
4. The システム shall WCAG比はsRGBの相対輝度（標準ガンマ補正）で計算する
5. The システム shall シェードビューのホバー表示でも新しいコントラスト値を反映する

---

### Requirement 4: リアルタイム更新

**Objective:** As a ユーザー, I want 背景色変更がスムーズに反映されてほしい, so that 快適に操作できる

#### Acceptance Criteria

1. The システム shall カラーピッカーでの色選択時にリアルタイムでプレビューを更新する
2. The システム shall HEX入力時にデバウンス処理（150ms）を適用し、入力完了後に更新する
3. The システム shall コントラスト再計算を200ms以内に完了する
4. While 再計算中, the システム shall 視覚的なローディング表示なしでシームレスに更新する（計算が高速なため）

---

### Requirement 5: 状態の永続化と画面間同期

**Objective:** As a デザイナー, I want 選択した背景色がセッション中維持されてほしい, so that ビュー切り替え時に再設定不要にしたい

#### Acceptance Criteria

1. The システム shall 背景色の状態をアプリケーション状態（state.backgroundColor）で管理する
2. When ビューを切り替えた時（パレット↔シェード↔アクセシビリティ）, the システム shall 選択中の背景色を維持する
3. The システム shall ブラウザのローカルストレージに背景色を保存し、ページリロード後も復元する
4. If 保存された背景色が無効な場合, the システム shall デフォルト（#ffffff）にフォールバックする
5. The システム shall パレット画面で背景色を変更した時、シェード画面の背景色も即座に同じ色に追従させる（逆方向も同様）
6. The システム shall シェード画面のシェードプレビュー領域に、選択中の背景色を適用して表示する

---

### Requirement 6: UI表示の適応

**Objective:** As a ユーザー, I want 背景色に応じてUI要素の色が適切に変化してほしい, so that 常に読みやすい状態を維持したい

#### Acceptance Criteria

1. The システム shall 背景色のモード（light/dark）に応じてテキスト色を自動切り替えする:
   - Lightモード: 黒テキスト
   - Darkモード: 白テキスト
2. The システム shall コントラストバッジ（AAA/AA/L）の表示色を背景色に応じて調整する
3. The システム shall シェードスウォッチのボーダー色を背景色に応じて調整し、視認性を確保する
4. If 背景色とパレット色のコントラストが1.5未満の場合, the システム shall そのスウォッチにボーダーを追加して識別可能にする

---

## Non-Functional Requirements

### パフォーマンス
- コントラスト再計算: 20色パレットで200ms以内
- デバウンス: HEX入力時150ms、カラーピッカー操作時はリアルタイム

### テスト要件
- ユニットテストカバレッジ: 90%以上
- E2Eテスト: 背景色変更とコントラスト更新の確認

### ブラウザ対応
- カラーピッカー: `<input type="color">` を使用（全モダンブラウザ対応）
- ローカルストレージ: localStorage API使用

### アクセシビリティ
- 背景色セレクターにラベル（aria-label）を付与
- キーボード操作でプリセット選択可能
