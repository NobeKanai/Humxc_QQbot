import { segment, Sendable } from "oicq";
import { BotShell } from "../bot";
import { cfg } from "../config";
import { safeImageStream, sleep } from "../utils";

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
    sh.registerGroupCommandWithRegex("(来点)?(涩|色|瑟|铯)图", "717552407:member", async (e) => {
        if (setulock) return;
        setulock = true;

        try {
            let url = await (await fetch(new URL("/random", BASE_URL))).text();

            for (let i = 1; i <= 3; i++) {
                try {
                    await e.reply(segment.image(await safeImageStream((new URL(url, BASE_URL)).toString())));
                    return;
                } catch (err) {
                    sh.logger.error("when sending image", err, "sleep 3s");
                    await sleep(3000);
                }
            }
        } catch (err) {
            sh.logger.error("when fetching random url", err);
        } finally {
            setulock = false;
        }

        await e.reply("failed");
    });

    const sendByForwarding = async (urls: string[]) => {
        let msgs: Sendable[] = [];

        for (const url of urls) {
            msgs.push(segment.image(await safeImageStream((new URL(url, BASE_URL)).toString())));
            addImage(url); // TODO
        }

        msgs.push(`Total ${urls.length}`);

        for (const group_id of cfg.giveme20.groups_id) {
            try {
                await sh.sendForwardMsgToGroup(group_id, msgs);
            } catch (err) {
                sh.logger.error("forwarding message:", err);
                for (const admin of cfg.admins) {
                    await sh.sendPrivateMsg(admin, `转发消息失败: ${err}`);
                }
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
                                segment.image(await safeImageStream((new URL(url, BASE_URL)).toString())),
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

    sh.registerGroupCommandWithRegex("更新(涩|色|瑟|铯)图", "717552407:admin", async (e) => {
        if (schedulinglock) {
            await sh.sendGroupMsg(e.group_id, "更新中...");
            return;
        }
        schedulinglock = true;
        sh.logger.info("start updating (triggered by command)");
        try {
            const urls = (await (await fetch(new URL("/update", BASE_URL))).json() as string[]).filter(
                (url) => {
                    return !hasImage(url);
                },
            );

            if (urls.length > 0) {
                await sh.sendGroupMsg(e.group_id, `更新了 ${urls.length} 张瑟图`);
            } else {
                await sh.sendGroupMsg(e.group_id, `暂无更新`);
            }

            if (urls.length <= 3) {
                for (const group_id of cfg.giveme20.groups_id) {
                    for (const url of urls) {
                        try {
                            await sh.sendGroupMsg(
                                group_id,
                                segment.image(await safeImageStream((new URL(url, BASE_URL)).toString())),
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
            sh.logger.error("updating", err);
        } finally {
            schedulinglock = false;
            sh.logger.info("updating done");
        }
    });
}
