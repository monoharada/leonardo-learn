export const t = {
    title: "Leonardo Learn デモ",
    subtitle: "OKLCHカラーパレット生成ツール",
    controls: {
        keyColors: "キーカラー (カンマ区切りHex)",
        ratios: "目標コントラスト比 (カンマ区切り)",
        regenerate: "パレット再生成",
    },
    palette: {
        target: "目標",
        generated: "生成パレット",
    },
    accessibility: {
        wcag2: "WCAG 2.1",
        apca: "APCA (WCAG 3)",
        status: {
            aaa: "AAA (最高)",
            aa: "AA (標準)",
            aaLarge: "AA Large (大きめの文字)",
            fail: "不適合",
        },
        apcaStatus: {
            preferredBody: "本文に最適",
            minBody: "本文の最小限",
            minLarge: "見出しの最小限",
            minHeader: "大見出しの最小限",
            minSpot: "装飾テキストの最小限",
            fail: "不適合",
        }
    }
};

export const getWCAGLabel = (status: string): string => {
    switch (status) {
        case 'AAA': return t.accessibility.status.aaa;
        case 'AA': return t.accessibility.status.aa;
        case 'AA Large': return t.accessibility.status.aaLarge;
        default: return t.accessibility.status.fail;
    }
};

export const getAPCALabel = (status: string): string => {
    if (status.includes('Preferred for body')) return t.accessibility.apcaStatus.preferredBody;
    if (status.includes('Minimum for body')) return t.accessibility.apcaStatus.minBody;
    if (status.includes('Minimum for large text')) return t.accessibility.apcaStatus.minLarge;
    if (status.includes('Minimum for large headers')) return t.accessibility.apcaStatus.minHeader;
    if (status.includes('Minimum for spot')) return t.accessibility.apcaStatus.minSpot;
    return t.accessibility.apcaStatus.fail;
};
