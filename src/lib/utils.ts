import crypto from "crypto";
import { Readable } from "stream";

export const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export const timestamp = () => Math.floor(Date.now() / 1000);

export const safeImageStream = async (url: string) => {
    const reader = (await fetch(url)).body!.getReader();
    return new Readable({
        async read() {
            try {
                const { done, value } = await reader.read();
                if (done) {
                    this.push(crypto.randomBytes(10));
                    this.push(null);
                    return;
                }
                this.push(value);
            } catch (err: any) {
                this.destroy(err);
                reader.cancel(err);
            }
        },
    });
};

const editDistance = (a: string, b: string): number => {
    const n = a.length, m = b.length;
    const dp = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) dp[i][0] = i;
    for (let i = 1; i <= m; i++) dp[0][i] = i;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return dp[n][m];
};

export const closestWord = (word: string, candidates: string[]): string | undefined => {
    if (candidates.length === 0) return undefined;

    let midx: number = 0, mv = Infinity;
    for (let i = 0; i < candidates.length; i++) {
        const ed = editDistance(word, candidates[i]);
        if (ed < mv) {
            mv = ed;
            midx = i;
        }
    }

    if (mv > word.length / 2) return undefined;

    return candidates[midx];
};
