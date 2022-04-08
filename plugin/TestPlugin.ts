import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig } from "../lib/plugin";
export class PluginConfig implements BotPluginConfig {
    PluginName: string = "TestPlugin";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.bot.on("bot.atselfmsg", (data: any) => console.log("一条@消息"));
        this.bot.regKeyword(
            "test",
            (message) => {
                console.log(message.raw_message);
            },
            "private"
        );
    }
}
