import { Config as OICQConfig } from "oicq";

export interface Config {
    oicq: OICQConfig;
    admins: number[];
    id: number;
    giveme20: {
        base_url: string;
    };
}

export let cfg: Config = {
    oicq: {
        platform: 3,
        log_level: "info",
    },
    id: -1,
    admins: [],
    giveme20: {
        base_url: "",
    },
};

export function initConfig(_cfg: object): void {
    let merged = { ...cfg, ..._cfg };

    if (merged.id === -1) throw new Error("id is required");
    if (!merged.admins.includes(merged.id)) merged.admins.unshift(merged.id);

    if (merged.giveme20.base_url === "") throw new Error("giveme20.base_url is required");

    cfg = merged;
}
