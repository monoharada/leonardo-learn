# Requirements Document

## Introduction
本ドキュメントは「CUD-aware Harmony Generator」機能の要件を定義する。この機能は、ブランドカラーを核にCUD推奨配色に寄せつつ、ブランド調とも破綻しないハーモニー生成を実現する。既存のCUD検証・スナップ機能（表示時適用）を拡張し、**生成時**にCUD最適化を行う新しいアルゴリズムを提供する。

## Requirements

### Requirement 1: アンカーカラー設定
**Objective:** デザイナーとして、ブランドカラーをアンカー（基準色）として設定し、そのCUD適合度に応じた処理方法を選択したい。これにより、ブランドアイデンティティを維持しながらCUD対応パレットを生成できる。

#### Acceptance Criteria
1. When ユーザーがアンカーカラーを設定する, the Harmony Generator shall 入力色の最も近いCUD推奨色を検索し、ΔE値とマッチレベル（exact/near/moderate/off）を表示する
2. When アンカーカラーのマッチレベルが exact または near である, the Harmony Generator shall そのCUD推奨色をアンカーとして自動採用する
3. When アンカーカラーのマッチレベルが moderate または off である, the Harmony Generator shall 「ブランド優先」または「CUD優先」の選択UIを表示する
4. If ユーザーが「ブランド優先」を選択した場合, then the Harmony Generator shall 元のブランドカラーをアンカーとして使用し、他の色でCUD補正を優先する
5. If ユーザーが「CUD優先」を選択した場合, then the Harmony Generator shall 最も近いCUD推奨色をアンカーとして使用する
6. The Harmony Generator shall アンカーカラーの設定状態（元の色、CUD最近接色、選択モード）を保持し、いつでも参照できるようにする

### Requirement 2: CUD許容ゾーン定義
**Objective:** 開発者として、CUD色との距離に基づく3段階のゾーン（Safe/Warning/Off）を定義し、生成アルゴリズムがゾーン別に適切な処理を行えるようにしたい。これにより、段階的なCUD適合度管理が可能になる。

#### Acceptance Criteria
1. The Harmony Generator shall 以下の3ゾーンをデフォルト閾値で定義する：
   - Safe Zone: ΔE ≤ 0.05（CUD推奨色と同等とみなす）
   - Warning Zone: 0.05 < ΔE ≤ 0.12（許容範囲内だが補正推奨）
   - Off Zone: ΔE > 0.12（CUD非準拠）
2. The Harmony Generator shall ゾーン閾値をユーザーが設定画面でカスタマイズできるようにする
3. When 色がSafe Zoneに属する, the Harmony Generator shall その色をCUD準拠として扱い、スナップを適用しない
4. When 色がWarning Zoneに属する, the Harmony Generator shall ソフトスナップ（戻り係数付き補正）を適用可能にする
5. When 色がOff Zoneに属する, the Harmony Generator shall UIで警告を表示し、Strictモードではハードスナップを適用する
6. The Harmony Generator shall 各色のゾーン判定結果をメタデータとして出力に含める

### Requirement 3: CUD-aware最適化アルゴリズム
**Objective:** システムとして、ハーモニー生成時にCUD距離とブランド調和の両方を考慮した最適化を行いたい。これにより、CUD準拠かつ視覚的に調和したパレットを自動生成できる。

#### Acceptance Criteria
1. When ハーモニー生成がリクエストされる, the Harmony Generator shall 既存のHCTベースアルゴリズムで候補色を生成する
2. When 候補色が生成された, the Harmony Generator shall 各候補色に対してCUD推奨色との ΔE（CUD距離）を計算する
3. The Harmony Generator shall 以下の目的関数を最小化する最適化を実行する：
   - 目的関数 = Σ(CUD距離) + λ × (1 - 調和スコア)
   - λ（重み係数）はモードに応じて調整可能
4. When Soft Snapモードが有効な場合, the Harmony Generator shall Safe Zoneからの色選択を優先し、不足時はWarning Zoneから補充する
5. When 最適化が完了した, the Harmony Generator shall 目的関数の値とCUD準拠率を結果に含める
6. If 最適化後もOff Zone色が残る場合, then the Harmony Generator shall 警告を表示し、代替候補を提案する

### Requirement 4: ブランド調和スコア維持
**Objective:** デザイナーとして、CUD最適化後もブランドカラーとの視覚的調和が維持されていることを数値で確認したい。これにより、CUD対応と美的品質のトレードオフを定量的に評価できる。

#### Acceptance Criteria
1. The Harmony Generator shall 調和スコアを以下の式で計算する：
   - harmonyScore = w1 × hueDistanceScore + w2 × lightnessGapScore + w3 × contrastFitScore
   - 各重みはデフォルト値を持ち、カスタマイズ可能
2. When パレットが生成された, the Harmony Generator shall アンカーカラーとの調和スコアを0-100の範囲で算出する
3. The Harmony Generator shall 調和スコアが設定された閾値（デフォルト: 70）以下の場合に警告を表示する
4. When 調和スコアが閾値以下かつ再生成が可能な場合, the Harmony Generator shall 調和スコア優先の代替パレットを提案する
5. The Harmony Generator shall 調和スコアの内訳（色相距離、明度差、コントラスト適合度）を詳細表示できるようにする
6. While Soft Snapモードでスナップ量を決定する際, the Harmony Generator shall 調和スコアへの影響を考慮してスナップ量を制限する

### Requirement 5: Soft Snapモード
**Objective:** デザイナーとして、生成された色がWarning Zoneを外れた場合のみ自動的に補正し、補正量を最小限に抑えたい。これにより、ブランドカラーに近い色を維持しながらCUD適合度を向上できる。

#### Acceptance Criteria
1. When Soft Snapモードが有効かつ色がSafe Zoneにある, the Harmony Generator shall スナップを適用せずに元の色を出力する
2. When Soft Snapモードが有効かつ色がWarning Zoneにある, the Harmony Generator shall 戻り係数（0.3-0.7）を適用した部分的スナップを実行する
3. When Soft Snapモードが有効かつ色がOff Zoneにある, the Harmony Generator shall Warning Zone境界までスナップし、完全なCUD色への移動は行わない
4. The Harmony Generator shall Soft Snap適用時に「この色はブランド維持のためCUDからΔE=X.XXで許容」という説明を自動生成する
5. The Harmony Generator shall 戻り係数をユーザーが0.0-1.0の範囲で調整できるようにする（0.0: スナップなし、1.0: 完全スナップ）
6. When Soft Snapが適用された, the Harmony Generator shall 補正前後の色とΔE変化量をツールチップで表示する

### Requirement 6: 4段階モードセレクター
**Objective:** ユーザーとして、CUD対応の厳密さを4段階から選択し、用途に応じた最適なモードでパレット生成を行いたい。これにより、プロジェクト要件に合わせた柔軟なCUD対応が可能になる。

#### Acceptance Criteria
1. The Harmony Generator shall 以下の4モードを提供する：
   - Off: CUD検証・スナップなし（従来動作）
   - Guide: CUD検証結果を参考表示のみ（スナップなし）
   - Soft Snap: 生成時にソフトスナップを適用
   - Strict: 全色をCUD推奨色にハードスナップ
2. When ユーザーがモードを切り替える, the Harmony Generator shall 即座にパレットを再計算し、プレビューを更新する
3. The Harmony Generator shall 現在のモードをUIに明示的に表示し、モード名とアイコンで識別可能にする
4. When Guideモードが選択されている, the Harmony Generator shall 各色のゾーン（Safe/Warning/Off）をバッジで表示する
5. When Soft Snapモードが選択されている, the Harmony Generator shall スナップ適用色にはΔE変化量をバッジで表示する
6. When Strictモードが選択されている, the Harmony Generator shall 全色がCUD推奨色であることを緑色のチェックマークで表示する
7. The Harmony Generator shall 選択されたモードをローカルストレージに保存し、次回起動時に復元する

### Requirement 7: 生成結果のエクスポート
**Objective:** 開発者として、CUD最適化されたパレットをCUDメタデータ付きでエクスポートしたい。これにより、他のツールやドキュメントでCUD準拠情報を活用できる。

#### Acceptance Criteria
1. When パレットをエクスポートする, the Harmony Generator shall 以下のCUDメタデータを含める：
   - 各色のCUD推奨色ID/名称（スナップ先）
   - 各色のΔE値とゾーン判定
   - パレット全体のCUD準拠率
   - 使用したモード（Off/Guide/Soft Snap/Strict）
2. The Harmony Generator shall JSON形式でCUDメタデータ付きエクスポートをサポートする
3. The Harmony Generator shall CSSカスタムプロパティ形式でエクスポート時、コメントとしてCUD情報を付加する
4. When Strictモードでエクスポートする場合, the Harmony Generator shall CUD推奨色のみで構成されていることを示すフラグを含める
5. The Harmony Generator shall エクスポート時にCUD検証サマリー（警告数、エラー数）を表示する

### Requirement 8: 非機能要件
**Objective:** システムとして、CUD最適化処理がパフォーマンスとユーザビリティの要件を満たすようにしたい。これにより、大規模パレットでも快適に利用できる。

#### Acceptance Criteria
1. The Harmony Generator shall 20色以下のパレットに対するCUD最適化を200ms以内に完了する
2. The Harmony Generator shall 最適化処理中はプログレス表示を行い、ユーザーにフィードバックを提供する
3. The Harmony Generator shall すべての新規コードに対してTypeScript strict modeを適用する
4. The Harmony Generator shall 新規APIに対して90%以上のテストカバレッジを維持する
5. The Harmony Generator shall CUD最適化アルゴリズムの設計判断をADRとして文書化する
6. If 最適化処理が500msを超える場合, then the Harmony Generator shall 「計算中...」メッセージを表示し、キャンセルボタンを有効化する
