import {
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
    FriendRequestEvent,
} from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, LoadArea, BotPluginConfig } from "../lib/plugin";
import { getConfig, saveConfig } from "../lib/pluginFather";
export class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    PluginName: string = "为你点赞!";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "给指定好友点赞";
    Event?: string[] | undefined = ["system.online", "atSelfMessage", "newDay"];
}
type Config = {
    users: number[];
};
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, { users: [] });
    }

    event(
        eventName: string,
        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent | any
    ) {
        switch (eventName) {
            case "atSelfMessage":
                if (message.message[1].text != " 给我点赞") return;
                let qq = message.sender.user_id;
                if (!this.isFriend(qq)) {
                    message
                        .reply("先加个好友吧ヾ(≧▽≦*)o", true)
                        .catch((err: any) => this.logger.error(err));
                    return;
                }
                if (this.addUserItem(qq)) {
                    message
                        .reply("好！每天给你点赞！", true)
                        .catch((err: any) => this.logger.error(err));
                    this.bot
                        .pickFriend(qq)
                        .thumbUp(20)
                        .then((e: boolean) => {
                            this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
                        })
                        .catch((err: any) => this.logger.error(err));
                } else
                    message
                        .reply("你已经在点赞列表了🌹", true)
                        .catch((err: any) => this.logger.error(err));
                this.bot
                    .pickFriend(qq)
                    .thumbUp(20)
                    .then((e: boolean) => {
                        this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
                    })
                    .catch((err: any) => this.logger.error(err));
                break;
            case "system.online":
            case "newDay":
                setTimeout(() => {
                    this.config.users.forEach((qq: number) => {
                        this.bot
                            .pickFriend(qq)
                            .thumbUp(20)
                            .then((e: boolean) => {
                                this.logger.info(`给好友 ${qq} 点赞 - ` + (e ? "成功" : "失败"));
                            })
                            .catch((err: any) => this.logger.error(err));
                    });
                }, 20000);
                break;
            default:
                break;
        }
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
