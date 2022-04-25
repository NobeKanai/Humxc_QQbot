import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginProfile } from "../lib/plugin";
import { getConfig, getJsonData } from "../lib/pluginFather";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "TestPlugin";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}
class defaultConfig {
    name: string = "testplugin";
}
export class Plugin extends BotPlugin {
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile());
        this.config = getJsonData(this, "test", new defaultConfig());
    }
}
