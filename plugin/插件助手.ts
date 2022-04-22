import { FriendRequestEvent } from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig } from "../lib/plugin";
export class PluginConfig implements BotPluginConfig {
    PluginName: string = "PluginHelp";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "查询插件";
}
export class Plugin extends BotPlugin {
    private plugins!: Map<string, BotPlugin>;
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.plugins = this.bot.pluginManager.getPlugin();
        this.bot.regKeyword("^插件列表$", (message) => {
            if (this.bot.isAdmin(message.sender.user_id)) {
                let msg = `加载的插件: `;
                for (const plugin of this.plugins.values()) {
                    msg += "\n - " + plugin.pluginConfig.PluginName;
                }
                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        });
        this.bot.regKeyword("^插件信息$", (message) => {
            if (this.bot.isAdmin(message.sender.user_id)) {
                let msg = `插件信息: `;
                for (const plugin of this.plugins.values()) {
                    msg +=
                        "\n - " + plugin.pluginConfig.PluginName + ": " + plugin.pluginConfig.Info;
                }
                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        });
    }
}
