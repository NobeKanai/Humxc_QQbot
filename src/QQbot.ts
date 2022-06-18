import fs from "fs";
import { Level } from "level";
import { createClient } from "oicq";
import process from "process";
import YAML from "yaml";
import { Bot } from "./lib/bot";
import { cfg, initConfig } from "./lib/config";

function parseEnv(text: string): string {
    return text.replace(/\$\{(.*?)\}/g, function (_, ...args) {
        return (process.env[args[0]] || "").trim();
    });
}

async function main() {
    try {
        const file = fs.readFileSync(process.argv[2] || "config.yaml", "utf8");
        initConfig(YAML.parse(parseEnv(file)));
    } catch (err) {
        console.log(err);
        return;
    }

    const client = createClient(cfg.id, cfg.oicq);
    const db = new Level("./App/db_data", { valueEncoding: "json" });
    (new Bot(client, db)).start();
}

main();
