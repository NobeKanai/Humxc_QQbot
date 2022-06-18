import { Config as OICQConfig } from "oicq";

export interface Config {
    oicq: OICQConfig;
    admins: number[];
    id?: number;
}

export let cfg: Config = {
    oicq: {
        platform: 3,
        log_level: "info",
    },
    admins: [],
};

export function initConfig(_cfg: object): void {
    let merged = { ...cfg, ..._cfg };

    if (!merged.id) throw new Error("id is required");
    if (!merged.admins.includes(merged.id)) merged.admins.unshift(merged.id);

    cfg = merged;
}
