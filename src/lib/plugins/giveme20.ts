import { segment } from "oicq";
import { BotShell } from "../bot";
import { cfg } from "../config";
import { sleep } from "../utils";

const GROUP_ID = 717552407;
let setulock = false;
let schedulinglock = false;

export async function giveMe20(sh: BotShell): Promise<void> {
    const BASE_URL = cfg.giveme20.base_url;
    const images = await sh.get<string[]>("images", []);

    const addImage = (image: string) => {
        images.val.unshift(image);
        if (images.val.length > 1000) {
            images.val = images.val.slice(0, 1000);
        }
        images.update();
    };
    const hasImage = (image: string) => {
        return images.val.indexOf(image) !== -1;
    };

    sh.logger.info("BASE_URL is %s", BASE_URL);
    sh.registerGroupCommand("涩图", "717552407:member", async (e) => {
        if (setulock) return;
        setulock = true;

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
            setulock = false;
        }

        await e.reply("failed");
    });

    sh.registerJobWithInterval(300 * 1000, async () => {
        if (schedulinglock) return;
        schedulinglock = true;
        sh.logger.info("start updating");
        try {
            let urls: string[] = await ((await fetch(new URL("/update", BASE_URL))).json());
            for (let url of urls) {
                if (!hasImage(url)) {
                    try {
                        await sh.sendGroupMsg(GROUP_ID, segment.image((new URL(url, BASE_URL)).toString()));
                        addImage(url);
                    } catch (err) {
                        sh.logger.error("scheduling: when sending image", err);
                    }
                }
            }
        } catch (err) {
            sh.logger.error("scheduling", err);
        } finally {
            schedulinglock = false;
            sh.logger.info("updating done");
        }
    });
}
