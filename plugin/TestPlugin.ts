import { BotClient } from "../lib/core/client";
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
class defaultConfig implements BotPluginConfig {
    Users: User[] = [];
    name: string = "testplugin";
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile(), new defaultConfig());
        this.logger.info("dddd");
        let user: User = {
            R18: false,
            uid: 2928607724,
            type: "Person",
        };
        this.regCommand("/test", "global", "bot_admin", (m) => {
            console.log("触发命令");
        });
        this.regKeyword("hi", "global", "allow_all", (m) => {
            m.reply("Hi!");
        });
    }
}
