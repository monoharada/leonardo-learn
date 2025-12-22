# Implementation Plan

## Tasks

- [x] 1. 基盤型システムの構築
- [x] 1.1 (P) DADSトークンとブランドトークンの型定義を作成する
  - DADSカラーの10色相（blue, light-blue, cyan, green, lime, yellow, orange, red, magenta, purple）を表現する型を定義
  - 有彩色スケール（50-1200）と無彩色スケール（420, 536を含む）を別々の型として定義
  - カテゴリ（chromatic, neutral, semantic）を識別する型を定義
  - 派生タイプ（strict-snap, soft-snap, reference, manual）を表現する型を定義
  - DADSトークンはreadonly修飾子で全プロパティを不変に保護
  - alpha値を持つトークンのためのオプショナルフィールドを追加
  - DADS参照情報（tokenId, tokenHex, tokenAlpha, deltaE, derivationType, zone）を保持する構造を定義
  - ブランドトークンにoriginalHex（最適化前の入力色）を保持するフィールドを追加
  - ColorToken型（DadsToken | BrandToken）をDiscriminated Unionで定義
  - isDadsToken/isBrandToken型ガード関数を実装
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.2 (P) ブランドトークンID生成機能を実装する
  - brand-{namespace}-{role}-{shade}形式のID生成ロジックを実装
  - 名前空間が指定された場合はIDに含める
  - シェード値のデフォルトを500に設定
  - 既存IDセットとの重複チェックを行い、重複時は数値サフィックス（-2, -3等）を付加
  - 入力値のサニタイズ処理（小文字化、スペース→ハイフン、特殊文字除去）を実装
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. DADSプリミティブのインポート機能
- [x] 2.1 CSSからDADSプリミティブカラーをパースする機能を実装する
  - --color-primitive-{hue}-{scale}形式のCSS変数をパースしてDadsTokenオブジェクトを生成
  - --color-neutral-white/black形式のCSS変数を処理し、適切な日本語名を設定
  - --color-neutral-{solid|opacity}-gray-{scale}形式のグレースケールを処理
  - rgba()形式の値をパースしてhexとalpha値に分離
  - パース失敗時は警告を出力してスキップ継続
  - --color-semantic-{name}形式のセマンティック色をvar()参照を保持したままインポート
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.2 セマンティックトークンの参照解決機能を実装する
  - var(--color-primitive-{hue}-{scale})形式の参照をパースする
  - 対応するプリミティブトークンのHEX値を検索して返却
  - 参照先が存在しない場合はnullを返却
  - CUDマッピング前に呼び出されることを想定した設計
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.3 CUDマッピング付加機能を実装する
  - DADSトークン配列とCUD推奨20色配列を受け取る
  - 各トークンについて最も近いCUD色を検索しdeltaEを計算
  - classification.cudMappingプロパティにnearestCudIdとdeltaEを設定
  - var()参照を持つトークン（hex値が#で始まらない）はスキップ
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. CUD処理層の拡張
- [x] 3.1 Snapperにderivation情報を追加する
  - SoftSnapResult型にderivationプロパティを追加
  - derivationにtype, dadsTokenId, dadsTokenHex, brandTokenHexを含める
  - 既存のプロパティ（hex, originalHex, cudColor, snapped, deltaE, zone, deltaEChange, explanation）は変更なし
  - スナップ結果に基づいてderivation.typeを適切に設定（strict-snap/soft-snap/reference）
  - 既存テストが壊れないことを確認
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 3.2 OptimizerにbrandToken情報を追加する
  - OptimizedColor型にbrandTokenプロパティを追加
  - brandTokenにsuggestedIdとdadsReferenceを含める
  - Snapperから受け取ったderivation情報をdadsReferenceに変換
  - 既存のプロパティ（hex, originalHex, zone, deltaE, snapped, cudTarget）は変更なし
  - 既存テストが壊れないことを確認
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. サービスAPI v1/v2互換性対応
- [x] 4.1 processPaletteWithModeのv2対応を実装する
  - apiVersionオプション（"v1" | "v2"）を追加
  - v1またはapiVersion未指定時はProcessPaletteResultV1（palette: OptimizedColor[]）を返却
  - v2指定時はProcessPaletteResultV2（brandTokens: BrandToken[], dadsReferences: Map）を返却
  - TypeScript genericsを使用して戻り値の型を自動推論
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 4.2 アンカーカラー指定とコンテキスト対応を実装する
  - anchorオプション（anchorHex, anchorIndex, isFixed）を追加
  - isFixed=false指定時は警告を出力してtrueとして扱う（現在未実装のため）
  - generationContextオプションを追加してID生成時に使用
  - パレット内の色にIDを割り当てる際にコンテキストのusedIdsを参照
  - _Requirements: 9.4, 9.5, 9.6_

- [x] 5. エクスポート機能のv2対応
- [x] 5.1 (P) CSSエクスポーターv2を実装する
  - DADSプリミティブを--dads-{color}形式で出力
  - ブランドトークンを--brand-{role}-{shade}形式で出力
  - alpha値を持つトークンはrgba(R, G, B, alpha)形式で出力
  - alpha値がないか1の場合は#RRGGBB形式で出力
  - derivationコメント（参照先DADS、deltaE、派生タイプ）を追加
  - 不変性を示すコメントをDADSセクションに追加
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5.2 (P) JSONエクスポーターv2を実装する
  - metadataセクション（version, generatedAt, tokenSchema）を出力
  - dadsTokensオブジェクトにid, hex, nameJa, nameEn, source, immutableプロパティを含める
  - alpha値を持つDadsTokenにはalphaプロパティを追加
  - brandTokensオブジェクトにid, hex, source, originalHex, dadsReferenceを含める
  - dadsReferenceにtokenId, tokenHex, tokenAlpha, deltaE, derivationType, zoneを含める
  - cudSummaryにcomplianceRate, mode, zoneDistributionを出力
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 6. UI保護機能とマイグレーション
- [x] 6.1 (P) トークン編集保護機能を実装する
  - isDadsToken判定を使用して編集可否を決定
  - DADSトークン編集時に「DADSプリミティブカラーは変更できません」メッセージを返却
  - 代替案として「独自の色が必要な場合は「ブランドトークンを作成」を選択してください」を提示
  - TokenEditGuard型（canEdit, reason, suggestion）を返却する関数を実装
  - _Requirements: 12.1, 12.2_

- [x] 6.2 (P) マイグレーションユーティリティを実装する
  - OptimizedColor配列をBrandToken配列に変換
  - MigrationResult型（brandTokens, warnings, unmigrated）を返却
  - DADS参照を特定できない色はunmigratedに追加
  - brandPrefixとrolesオプションでID生成をカスタマイズ可能に
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 7. 統合テストとUI連携
- [x] 7.1 パレット生成からエクスポートまでの統合テストを作成する
  - v2 APIでのパレット生成→BrandToken配列取得のフローを検証
  - CSS/JSONエクスポートv2形式の出力を検証
  - v1 APIとの後方互換性を検証
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 11.1_

- [x] 7.2 UIコンポーネントでのトークン表示と保護を実装する
  - DADSトークンには鍵アイコン（参照専用）を表示
  - ブランドトークンには編集アイコンを表示
  - DADSトークンの編集コントロールを無効化
  - 読み取り専用状態を視覚的に区別
  - _Requirements: 12.3, 12.4_

