import { Level } from "level";
import { createClient } from "oicq";
import { Bot } from "./lib/bot";
import { cfg, initConfig } from "./lib/config";

async function main() {
    try {
        initConfig(require("./config"));
    } catch (err) {
        console.log(err);
        return;
    }

    const client = createClient(cfg.id!, cfg.oicq);
    const db = new Level<string, any>("./App/db_data", { valueEncoding: "json" });
    (new Bot(client, db)).start();
}

main();
