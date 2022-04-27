import { BotClient } from "../lib/core/client";
import { CommandError } from "../lib/core/commandManager";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import { getJsonData } from "../lib/pluginFather";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "TestPlugin";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}
interface User extends BotPluginUser {
    R18: boolean;
}
export class PluginConfig implements BotPluginConfig {
    Users: User[] = [];
    name: string = "testplugin";
}
export class Plugin extends BotPlugin<PluginConfig> {
    constructor(
        botClient: BotClient,
        pluginProfile: BotPluginProfile,
        defaultConfig: PluginConfig
    ) {
        super(botClient, pluginProfile, defaultConfig);
        this.logger.info("dddd");
        let user: User = {
            R18: false,
            uid: 2928607724,
            type: "Person",
        };
        this.regCommand("/test", "global", "bot_admin", (m, arg) => {
            console.log("触发命令");
            if (arg === "err") {
                throw new CommandError("抛出 command error");
            } else {
                return "这是一条 /test 的返回值";
            }
        });
        this.regKeyword("hi", "global", "allow_all", (m) => {
            m.reply("Hi!");
        });
    }
}
