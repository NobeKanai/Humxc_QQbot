import { FriendRequestEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, LoadArea, BotPluginConfig } from "../lib/plugin";
export class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    PluginName: string = "AutoAddFriend";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "自动添加好友";
    Event?: string[] | undefined = ["request.friend.single"];
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
    }

    event(eventName: string, data: any) {
        let ev: FriendRequestEvent = data;
        this.bot.pickFriend(ev.user_id).addFriendBack(ev.seq);
    }
}
