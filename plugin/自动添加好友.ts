import { FriendRequestEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, LoadArea, BotPluginConfig } from "../lib/plugin";
export class PluginConfig implements BotPluginConfig {
    PluginName: string = "AutoAddFriend";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "自动添加好友";
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.bot.on("request.friend.add", (event: FriendRequestEvent) => {
            this.bot.pickFriend(event.user_id).addFriendBack(event.seq);
        });
    }
}
