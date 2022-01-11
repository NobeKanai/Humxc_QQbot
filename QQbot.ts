"use strict";
import config from "./config";
const createClient = require("./lib/core/client").client;
var botConfigs = config.botConfigs;
var oicqConfig = config.oicqConfig;
var clients = new Array();
//加载配置
botConfigs.forEach((botConfig) => {
  clients.push(createClient(oicqConfig, botConfig));
});
