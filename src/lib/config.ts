import { Config as OICQConfig } from "oicq";
import { join } from "path";

export interface Config {
    oicq: OICQConfig;
    admins: number[];
    id: number;
    data_dir: string;
    giveme20: {
        base_url: string;
        groups_id: number[];
        update_interval: number;
    };
    b23live: {
        permissions: string; // TODO: use list permissions
        update_interval: number;
    };
}

export let cfg: Config = {
    oicq: {
        platform: 3,
        log_level: "info",
    },
    id: -1,
    admins: [],
    data_dir: "./data",
    giveme20: {
        base_url: "",
        groups_id: [],
        update_interval: 300, // 5 minutes
    },
    b23live: {
        permissions: "",
        update_interval: 300, // 5 minutes
    },
};

function merge(origin: any, _cfg: any, path: string = ""): void {
    for (const key in origin) {
        if (_cfg[key] === null || _cfg[key] === undefined) continue;

        if (typeof origin[key] === "object" && !Array.isArray(origin[key])) {
            merge(origin[key], _cfg[key], path + (path === "" ? "" : ".") + key);
        } else {
            if (typeof origin[key] !== typeof _cfg[key]) {
                throw new Error(
                    `${path + (path === "" ? "" : ".")}${key} required type ${typeof origin[
                        key
                    ]}, but got ${typeof _cfg[key]}`,
                );
            }
            if (Array.isArray(origin[key]) && !Array.isArray(_cfg[key])) {
                throw new Error(
                    `${path + (path === "" ? "" : ".")}${key} required an array, but got an object`,
                );
            }

            origin[key] = _cfg[key];
        }
    }
}

export function initConfig(_cfg: object): void {
    merge(cfg, _cfg);
    console.log(cfg);

    // required configuration items
    if (cfg.id === -1) throw new Error("id is required");
    if (!cfg.admins.includes(cfg.id)) cfg.admins.unshift(cfg.id);

    if (cfg.giveme20.base_url === "") throw new Error("giveme20.base_url is required");

    // deal with data directory
    if (cfg.oicq.data_dir === undefined) {
        cfg.oicq.data_dir = join(cfg.data_dir, "oicq");
    }
}
