import { PrivateMessageEvent, GroupMessageEvent, DiscussMessageEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import { getJsonData } from "../lib/pluginFather";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "Thumbs-up";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "给好友点赞";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile(), new PluginConfig());
        this.config = getJsonData(this, "config", new PluginConfig());
        this.client.on("system.online", () => {
            this.startLike(0);
        });
        this.client.on("bot.newday", () => {
            this.startLike(1200000);
        });
        this.regKeyword("给我点赞", "global", "atme", (message) => {
            let uid = message.sender.user_id;
            if (this.client.isFriend(uid)) {
                if (this.hasPersonUser(uid)) {
                    message
                        .reply("你已经在点赞列表了🌹", true)
                        .catch((err: any) => this.logger.error(err));
                } else {
                    let user: BotPluginUser = {
                        uid: uid,
                        type: "Person",
                    };
                    if (this.addUser(user)) {
                        try {
                            this.saveConfig();
                        } catch (error) {
                            this.logger.error(error);
                            message
                                .reply("不好！保存配置时出现异常！", true)
                                .catch((err: any) => this.logger.error(err));
                            return;
                        }
                        message
                            .reply("好！每天给你点赞！", true)
                            .catch((err: any) => this.logger.error(err));
                        this.like(uid);
                    } else {
                        message
                            .reply("不好！添加用户失败！", true)
                            .catch((err: any) => this.logger.error(err));
                    }
                }
            } else {
                message
                    .reply("先加个好友吧ヾ(≧▽≦*)o", true)
                    .catch((err: any) => this.logger.error(err));
                return;
            }
        });
    }
    private async startLike(timeout: number) {
        for (const user of this.users.person.values()) {
            this.like(user.uid);
            await sleep(10000);
        }
    }

    /** 点赞操作 */
    private like(uid: number) {
        this.client
            .pickFriend(uid)
            .thumbUp(20)
            .then((e: boolean) => {
                this.logger.info(`给好友 ${uid} 点赞 - ` + (e ? "成功" : "失败"));
            })
            .catch((err: any) => this.logger.error(err));
    }
}
function sleep(timeout: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), timeout));
}
