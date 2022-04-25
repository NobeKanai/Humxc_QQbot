import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginProfile } from "../lib/plugin";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "TestPlugin";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile());
        this.bot.on("bot.atselfmsg", (data: any) => {
            this.logger.debug("一条@消息");
        });
        this.bot.regKeyword(
            "test",
            (message) => {
                console.log(message.raw_message);
            },
            "private"
        );
    }
}
