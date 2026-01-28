/**
 * キーカラー導出モジュールの型定義
 *
 * プライマリカラーからセカンダリ/ターシャリを導出するための
 * 設定と結果の型を定義する。
 *
 * @module @/core/key-color-derivation/types
 */

import type { Color } from "../color";
import type { DadsChromaScale, DadsToken } from "../tokens/types";

/**
 * 導出設定
 *
 * プライマリカラーからセカンダリ/ターシャリを導出するための設定
 */
export interface DerivationConfig {
	/** プライマリカラー（HEX文字列またはColorインスタンス） */
	primaryColor: string | Color;
	/** 背景色（コントラスト計算用） */
	backgroundColor: string | Color;
	/**
	 * 擬似ランダム用seed（同じ入力+seedで結果を固定する）
	 *
	 * NOTE: UIの表示トグルとは独立して、導出の安定性/再現性のために使用する。
	 */
	seed?: string | number;
	/** セカンダリのUI要素用最小コントラスト（デフォルト: 3.0, WCAG AA UIコンポーネント準拠） */
	secondaryUiContrast?: number;
	/** ターシャリの最小コントラスト（デフォルト: 3.0, WCAG AA UIコンポーネント準拠） */
	tertiaryContrast?: number;
	/**
	 * DADS導出モード設定
	 * これらが設定されている場合、DADSトークンから選択する
	 */
	dadsMode?: {
		/** 読み込み済みDADSトークン配列 */
		tokens: DadsToken[];
		/** プライマリの基本クロマ名（例: "Blue", "Light Blue"） */
		baseChromaName: string;
		/** プライマリのステップ（重複回避用） */
		primaryStep?: DadsChromaScale;
	};
}

/**
 * 導出された単一カラーの情報
 */
export interface DerivedColor {
	/** 導出されたカラー */
	color: Color;
	/** HCTトーン値（0-100） */
	tone: number;
	/** 背景色に対するコントラスト比 */
	contrastRatio: number;
	/** 明度方向 */
	lightnessDirection: "lighter" | "darker";
	/** DADSステップ（50-1200）- DADSモード時のみ */
	step?: DadsChromaScale;
	/** DADSトークンID（例: "dads-blue-500"）- DADSモード時のみ */
	dadsTokenId?: string;
}

/**
 * 導出結果
 *
 * プライマリ、セカンダリ、ターシャリの完全な導出結果
 */
export interface DerivedColorSet {
	/** プライマリカラー情報 */
	primary: {
		color: Color;
		tone: number;
		contrastRatio: number;
	};
	/** セカンダリカラー情報 */
	secondary: DerivedColor;
	/** ターシャリカラー情報 */
	tertiary: DerivedColor;
	/** 共有色相（HCT色空間） */
	sharedHue: number;
	/** 共有彩度（HCT色空間） */
	sharedChroma: number;
	/** 背景モード */
	backgroundMode: "light" | "dark";
}

/**
 * DADS準拠のデフォルトコントラスト値
 *
 * デジタル庁デザインシステムの仕様に基づく
 */
export const DADS_CONTRAST_DEFAULTS = {
	/** プライマリ（テキスト用）: WCAG AA準拠 */
	primaryText: 4.5,
	/** セカンダリ（UI要素用）: WCAG AA UIコンポーネント準拠 */
	secondaryUi: 3.0,
	/** セカンダリ（テキスト用）: WCAG AA準拠 */
	secondaryText: 4.5,
	/** ターシャリ（UI要素用）: WCAG AA UIコンポーネント準拠 */
	tertiary: 3.0,
} as const;
