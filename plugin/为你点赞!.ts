import {
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
    FriendRequestEvent,
    PrivateMessage,
    GroupMessage,
    DiscussMessage,
} from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig } from "../lib/plugin";
import { getConfig, saveConfig } from "../lib/pluginFather";
export class PluginConfig implements BotPluginConfig {
    PluginName: string = "为你点赞!";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "给指定好友点赞";
}
type Config = {
    users: number[];
};
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, { users: [] });
        this.bot.on("bot.atselfmsg", (msg) => this.interact(msg));
        this.bot.on("system.online", () => this.like());
    }
    interact(message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) {
        if (/给我点赞$/.exec(message.raw_message) == null) return;
        let qq = message.sender.user_id;
        if (!this.isFriend(qq)) {
            message
                .reply("先加个好友吧ヾ(≧▽≦*)o", true)
                .catch((err: any) => this.logger.error(err));
            return;
        }
        if (this.addUserItem(qq)) {
            message.reply("好！每天给你点赞！", true).catch((err: any) => this.logger.error(err));
            this.bot
                .pickFriend(qq)
                .thumbUp(20)
                .then((e: boolean) => {
                    this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
                })
                .catch((err: any) => this.logger.error(err));
        } else
            message.reply("你已经在点赞列表了🌹", true).catch((err: any) => this.logger.error(err));
        this.bot
            .pickFriend(qq)
            .thumbUp(20)
            .then((e: boolean) => {
                this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
            })
            .catch((err: any) => this.logger.error(err));
    }

    like() {
        if (this.bot.isOnline())
            setTimeout(async () => {
                for (let i = 0; i < this.config.users.length; i++) {
                    const qq = this.config.users[i];
                    try {
                        let e = await this.bot.pickFriend(qq).thumbUp(20);
                        this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
                        await sleep(5000);
                    } catch (error) {
                        this.logger.error(error);
                    }
                }
            }, 600000);
    }
    addUserItem(qq: number): boolean {
        if (new Set(this.config.users).has(qq)) {
            return false;
        }
        this.config.users.push(qq);
        saveConfig(this);
        return true;
    }
    isFriend(qq: number): boolean {
        return this.bot.fl.has(qq);
    }
}
function sleep(timeout: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), timeout));
}
