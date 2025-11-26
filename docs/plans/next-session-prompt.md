# 次回セッション用プロンプト: DADS公式準拠実装

## コンテキスト

Color Token Generatorプロジェクトのスタイリングを、デジタル庁デザインシステム（DADS）公式仕様に準拠させる作業を行います。

## 計画書

`docs/plans/dads-official-compliance.md` に7フェーズ・10ステップの包括的計画があります。

## 現状

- クラス命名: `dads-*` 採用済み
- トークン: 独自値（公式値ではない）
- フォント: システムフォント（Noto Sans JPではない）
- フォーカス: 簡易実装（公式パターンではない）
- リンクスタイル: 未実装
- ユーティリティ: なし

## 参照リソース

- 計画書: `docs/plans/dads-official-compliance.md`
- 現行トークン: `src/ui/styles/tokens.css`
- 現行コンポーネント: `src/ui/styles/components.css`
- HTML: `index.html`
- 公式トークン: https://github.com/digital-go-jp/design-tokens
- 公式HTMLコンポーネント: https://github.com/digital-go-jp/design-system-example-components-html

---

## プロンプト（コピー用）

```
DADS公式準拠の実装を開始します。

計画書: docs/plans/dads-official-compliance.md

以下の順序で進めてください:

1. まず計画書を読んで全体を把握
2. Step 1: 準備
   - npm install @digital-go-jp/design-tokens
   - 公式tokens.cssを docs/reference/ にコピー
3. Step 2: ファイル構成変更
   - global.css, utilities.css, app-components.css を新規作成
   - index.html の読み込み順序を変更
4. Step 3以降: Phase 1〜7を順次実装

各Phaseの完了後に:
- 表示確認
- 必要に応じてコミット
- 計画書のチェックリストを更新

質問があれば確認してください。
```

---

## 代替: 特定Phaseから開始する場合

### Phase 1（グローバルスタイル）のみ

```
DADS公式準拠のPhase 1（グローバルスタイル）を実装します。

計画書: docs/plans/dads-official-compliance.md のPhase 1セクションを参照

作業内容:
1. src/ui/styles/global.css を新規作成
2. html要素: scrollbar-gutter: stable
3. body要素: 公式トークン参照に変更
4. リンクスタイル: 4状態（unvisited/visited/hover/active）+ フォーカス
5. index.html にglobal.cssを追加

公式パターン:
- フォーカス: 4px solid black + 2px yellow shadow
- リンク: text-underline-offset: 3px, thickness: 1px（hover時3px）
```

### Phase 2（トークン置換）のみ

```
DADS公式準拠のPhase 2（デザイントークン置換）を実装します。

計画書: docs/plans/dads-official-compliance.md のPhase 2セクションを参照

作業内容:
1. npm install @digital-go-jp/design-tokens
2. 公式tokens.cssから値を抽出
3. src/ui/styles/tokens.css を公式命名規則・値に置換
4. components.css内の参照を更新

命名規則の変更例:
- --dads-primitive-neutral-900 → --color-neutral-solid-gray-900
- --dads-primitive-white → --color-neutral-base-white
- --dads-radius-md → --radius-2
```

### Phase 4（コンポーネント）のみ

```
DADS公式準拠のPhase 4（コンポーネントスタイル）を実装します。

計画書: docs/plans/dads-official-compliance.md のPhase 4セクションを参照

作業内容:
1. 共通フォーカススタイルの統一（4px black + 2px yellow shadow）
2. ボタンコンポーネントの公式パターン適用
   - data-type: solid-fill/outline/text
   - data-size: lg/md/sm/xs
   - hover時のunderline追加
3. インプットコンポーネントの公式パターン適用
4. index.htmlのdata属性を必要に応じて更新

公式HTMLコンポーネント参照:
https://github.com/digital-go-jp/design-system-example-components-html
```

---

## 注意事項

- 破壊的変更を避けるため、Phase単位で段階的に実装
- 各Phase完了後に表示確認を行う
- JSファイル（demo.ts）内のクラス名参照も同時に更新が必要な場合がある
- 特にPhase 5（dads- → app-への分離）はdemo.tsへの影響が大きい
