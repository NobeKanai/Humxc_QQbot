import { FriendRequestEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "AutoAddFriend";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "自动添加好友";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile(), new PluginConfig());
        this.client.on("request.friend.add", (event: FriendRequestEvent) => {
            this.client.pickFriend(event.user_id).addFriendBack(event.seq);
        });
    }
}
