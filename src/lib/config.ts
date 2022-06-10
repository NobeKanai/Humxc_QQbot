import { Config as OICQConfig } from "oicq";

export interface Config {
    oicq: OICQConfig;
    admins: number[];
    id?: number;
}

let defaultConfig: Config = {
    oicq: {
        platform: 3,
        log_level: "info",
    },
    admins: [],
};

export function makeConfig(cfg: object): Config {
    let merged = { ...defaultConfig, ...cfg };

    if (!merged.id) throw new Error("id is required");
    if (!merged.admins.includes(merged.id)) merged.admins.unshift(merged.id);

    return merged;
}
