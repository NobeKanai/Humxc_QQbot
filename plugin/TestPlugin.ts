import { BotClient } from "../lib/core/client";
import { BotPlugin, LoadArea, BotPluginConfig } from "../lib/plugin";
import { Message } from "oicq";
export class PluginConfig implements BotPluginConfig {
  LoadArea: LoadArea = "GLOBAL";
  PluginName: string = "TestPlugin";
  BotVersion: string = "0.1.1";
  PluginVersion: string = "0.0.1";
  Info: string = "测试用的插件";
  Event?: string[] | undefined = ["system.online"];
}
export class Plugin extends BotPlugin {
  constructor(botClient: BotClient) {
    super(botClient, new PluginConfig());
  }

  event(eventName: string, data: any) {
    switch (eventName) {
      case "system.online":
        this.logger.info("登陆了");
        break;
      default:
        break;
    }
  }
}
