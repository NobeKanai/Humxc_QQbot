import { Readable } from "stream";
import crypto from "crypto";

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
