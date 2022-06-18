import { segment } from "oicq";
import { BotShell } from "../bot";
import { cfg } from "../config";
import { sleep } from "../utils";

let lock = false;

export async function giveMe20(sh: BotShell): Promise<void> {
    const BASE_URL = cfg.giveme20.base_url;

    sh.logger.info("BASE_URL is %s", BASE_URL);
    sh.registerGroupCommand("涩图", "717552407:member", async (e) => {
        if (lock) return;
        lock = true;

        try {
            let url = await (await fetch(new URL("/random", BASE_URL))).text();

            for (let i = 1; i <= 3; i++) {
                try {
                    await e.reply(segment.image((new URL(url, BASE_URL)).toString()));
                    return;
                } catch (err) {
                    sh.logger.error("when sending image", err, "sleep 3s");
                    await sleep(3000);
                }
            }
        } catch (err) {
            sh.logger.error("when fetch random url", err);
        } finally {
            lock = false;
        }

        await e.reply("failed");
    });
}
