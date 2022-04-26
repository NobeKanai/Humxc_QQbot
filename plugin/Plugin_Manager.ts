import { FriendRequestEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginProfile, BotPluginConfig, BotPluginUser } from "../lib/plugin";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "PluginManager";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "查询插件";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin {
    private plugins!: Map<string, BotPlugin>;
    constructor(botClient: BotClient) {
        super(botClient, new PluginProfile(), new PluginConfig());
        this.plugins = this.client.pluginManager.pluginEntity;
        this.regKeyword("^插件列表$", "global", "allow_all", (message) => {
            if (this.client.isAdmin(message.sender.user_id)) {
                let msg = `加载的插件: `;
                for (const plugin of this.plugins.values()) {
                    msg += "\n - " + plugin.pluginProfile.PluginName;
                }
                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        });
        this.regCommand("/插件信息", "global", "bot_admin", (message, pluginName: string) => {
            let p = this.client.pluginManager.pluginEntity.get(pluginName);
            if (p != null) {
                message.reply(`${p.pluginProfile.PluginName}\n${p.pluginProfile.Info}`);
            }
        });
    }
}
