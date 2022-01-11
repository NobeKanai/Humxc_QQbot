const config = require("./config.js");
import { BotClient } from "./lib/core/client";
var botConfigs = config.botConfigs;
var oicqConfig = config.oicqConfig;
var clients = new Array();
//加载配置
botConfigs.forEach((botConfig: any) => {
  clients.push(new BotClient(oicqConfig, botConfig));
});
