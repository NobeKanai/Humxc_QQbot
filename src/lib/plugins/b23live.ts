import { segment } from "oicq";
import { BotShell } from "../bot";
import { cfg } from "../config";

interface Live {
    group_id: number;
    live_id: number;
    title: string;
    status: boolean;
    last_update: Date;
    username: string;
}

function liveAPI(live_id: number | string) {
    return `https://api.live.bilibili.com/room/v1/Room/get_info?id=${live_id}`;
}

export async function b23Live(sh: BotShell): Promise<void> {
    const lives = await sh.get<Live[]>("lives", []);
    const addLive = async (live: Live) => {
        lives.val.push(live);
        await lives.update();
    };
    const deleteLive = async (live: Pick<Live, "group_id" | "live_id">) => {
        const idx = lives.val.findIndex((l) => {
            return live.group_id === l.group_id && live.live_id === l.live_id;
        });
        if (idx !== -1) {
            lives.val.splice(idx, 1);
            await lives.update();
        } else {
            throw "此直播间未被注册";
        }
    };

    sh.registerGroupCommandWithRegex("订阅(直播)? \\d+", cfg.b23live.permissions, async (e) => {
        const live_id = parseInt(e.raw_message.split(" ")[1]);

        if (
            lives.val.findIndex((val) => {
                return val.group_id === e.group_id && val.live_id === live_id;
            }) !== -1
        ) {
            e.reply("订阅重复");
            return;
        }

        let rsp;
        try {
            rsp = await (await fetch(liveAPI(live_id))).json();
            if (rsp.code !== 0) {
                await e.reply(rsp.msg);
                return;
            }
        } catch (err: any) {
            sh.logger.error(err);
            await e.reply(`其它错误， 请检查日志`);
            return;
        }

        let user;
        try {
            user = await (await fetch(`https://api.bilibili.com/x/space/acc/info?mid=${rsp.data.uid}`)).json();
            if (user.code !== 0) throw user.msg;
        } catch (err) {
            sh.logger.error(err);
            await e.reply(`其它错误， 请检查日志`);
            return;
        }

        try {
            await addLive({
                group_id: e.group_id,
                live_id: live_id,
                title: rsp.data.title,
                status: Boolean(rsp.data.live_status),
                last_update: new Date(),
                username: user.data.name,
            });
            await e.reply(
                `已添加 ${user.data.name} 的直播间： ${rsp.data.title}\n当前状态：${rsp.data.live_status === 0 ? "未在直播" : "正在直播"}`,
            );
        } catch (err: any) {
            sh.logger.error(err);
            await e.reply(`其它错误， 请检查日志`);
        }
    });

    sh.registerGroupCommandWithRegex("退订(直播)? \\d+", cfg.b23live.permissions, async (e) => {
        const live_id = parseInt(e.raw_message.split(" ")[1]);
        try {
            await deleteLive({ group_id: e.group_id, live_id: live_id });
            await e.reply(`OK`);
        } catch (err: any) {
            sh.logger.error(err);
            await e.reply(err.toString());
        }
    });

    sh.registerGroupCommandWithRegex("(直播|订阅)列表", "all:member", async (e) => {
        await e.reply(`已订阅直播间：\n\n${
            lives.val.map((live) => {
                if (live.group_id === e.group_id) {
                    return `主播：${live.username}
标题：${live.title}
状态：${live.status === false ? "未在直播" : "正在直播"}
直播间：https://live.bilibili.com/${live.live_id}
更新于：${live.last_update.toLocaleString("en-GB", { timeZone: "Asia/Shanghai" })}`;
                }
            }).join("\n\n")
        }`);
    });

    sh.registerJobWithInterval(cfg.b23live.update_interval * 1000, async () => {
        sh.logger.info("start updating");

        for (const live of lives.val) {
            try {
                const rsp = await (await fetch(liveAPI(live.live_id))).json();
                if (rsp.code !== 0) throw rsp.msg;
                const user = await (await fetch(`https://api.bilibili.com/x/space/acc/info?mid=${rsp.data.uid}`))
                    .json();
                if (user.code !== 0) throw rsp.msg;

                live.username = user.data.name;
                live.title = rsp.data.title;
                live.last_update = new Date();
                if (!live.status && rsp.data.live_status === 1) {
                    let msg = [
                        `${live.username} 正在直播 ${live.title}\n$https://live.bilibili.com/${live.live_id}`,
                        segment.image(rsp.data.keyframe, true, 10),
                    ];
                    await sh.sendGroupMsg(
                        live.group_id,
                        msg,
                    );
                }
                live.status = Boolean(rsp.data.live_status);

                lives.update();
            } catch (err: any) {
                sh.logger.error(err);
                for (const user_id of cfg.admins) {
                    await sh.sendPrivateMsg(user_id, `when updating b23live(${live.live_id}): ` + err.toString());
                }
            }
        }

        sh.logger.info("done");
    });
}
