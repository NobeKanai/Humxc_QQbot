import { FriendRequestEvent } from "oicq";
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
export class Plugin extends BotPlugin<PluginConfig> {
    public init() {
        this.client.on("request.friend.single", async (event: FriendRequestEvent) => {
            this.addFriend(event);
        });
        this.client.on("request.friend.add", async (event: FriendRequestEvent) => {
            this.addFriend(event);
        });
    }
    async addFriend(event: FriendRequestEvent) {
        await sleep(5000);
        let result = false;
        try {
            result = await this.client.pickFriend(event.user_id).addFriendBack(event.seq);
        } catch (error) {
            this.logger.error(error);
        }
        this.logger.info(`自动添加 [${event.user_id}] 为好友: ${result ? "成功" : "失败"}`);
    }
}
async function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => resolve(), time);
    });
}
