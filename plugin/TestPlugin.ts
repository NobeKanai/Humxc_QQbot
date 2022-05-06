import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "TestPlugin";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin<PluginConfig> {
    public init() {
        this.regKeyword("/hi", "global", "allow_all", (message) => {
            message.reply("Hi!");
        });
    }
}
