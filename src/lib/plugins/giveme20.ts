import { segment } from "oicq";
import { BotShell } from "../bot";
import { cfg } from "../config";
import { sleep } from "../utils";

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
                    await e.reply(segment.image((new URL(url, BASE_URL)).toString(), true, 30));
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

    const sendByForwarding = async (urls: string[]) => {
        let msgs_id: string[] = [];

        for (const url of urls) {
            try {
                const msg = await sh.sendSelfMsg(segment.image((new URL(url, BASE_URL)).toString(), true, 30));
                addImage(url);
                msgs_id.push(msg.message_id);
            } catch (err) {
                sh.logger.error("sending message to self for future forwarding:", err);
            }
        }

        try {
            const msg = await sh.sendSelfMsg(`Total ${urls.length}. Sent ${msgs_id.length}`);
            msgs_id.push(msg.message_id);
        } catch (err) {
            sh.logger.error(err);
        }

        for (const group_id of cfg.giveme20.groups_id) {
            try {
                await sh.sendForwardMsgFromSelfToGroup(group_id, msgs_id);
            } catch (err) {
                sh.logger.error("forwarding message:", err);
            }
        }
    };

    sh.registerJobWithInterval(cfg.giveme20.update_interval * 1000, async () => {
        if (schedulinglock) return;
        schedulinglock = true;
        sh.logger.info("start updating");
        try {
            const urls = (await (await fetch(new URL("/update", BASE_URL))).json() as string[]).filter(
                (url) => {
                    return !hasImage(url);
                },
            );

            if (urls.length <= 3) {
                for (const group_id of cfg.giveme20.groups_id) {
                    for (const url of urls) {
                        try {
                            await sh.sendGroupMsg(
                                group_id,
                                segment.image((new URL(url, BASE_URL)).toString(), true, 30),
                            );
                            addImage(url);
                        } catch (err: any) {
                            if (err.code === -80) {
                                await sendByForwarding(urls);
                                return;
                            }
                            sh.logger.error("scheduling: when sending image", err);
                        }
                    }
                }
            } else {
                await sendByForwarding(urls);
            }
        } catch (err) {
            sh.logger.error("scheduling", err);
        } finally {
            schedulinglock = false;
            sh.logger.info("updating done");
        }
    });
}
