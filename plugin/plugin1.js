"use strict";
module.exports.PluginConfig = {
  /** 插件名称(必需) */
  PluginName: "testPlugin",
  /** 机器人版本 */
  BotVersion: "0.0.1",
  /** 插件版本 */
  PluginVersion: "1.0.0",
  /** 插件运行时数据隔离: "GLOBAL" "PRIVATE"(私聊) "GROUP"(群聊) */
  SessionArea: "GROUP",
  /** 说明 */
  Info: "这是用来测试的插件啊",
  /** 导入插件的类 */
  PluginClass: "test",
  /** 注册事件,二维数组表示,前一个参数为事件名称，后一个参数为函数名称
   * oicq的具体的事件列表见:TODO
   * 也可以添加自定义事件
   */
  Event: ["message", "system.online"],
  Keyword: ["关键词", `a+`, `重启`],
};
module.exports.Plugin = class {
  constructor(botClient) {
    /** 机器人客户端 */
    this.bot = botClient;
  }
  event(eventName, data) {
    switch (eventName) {
      case "system.online":
        console.log("登陆了");
        break;
      case "message":
        this.bot.logger.info(`收到了一条消息 - ${data.raw_message}`);
        break;
      default:
        break;
    }
  }
  keyword(keyworld, data) {
    switch (keyworld) {
      case "重启":
        this.bot.restart();
        break;

      default:
        break;
    }
  }
};
