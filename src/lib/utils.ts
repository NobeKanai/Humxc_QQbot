export const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export const timestamp = () => Math.floor(Date.now() / 1000);
