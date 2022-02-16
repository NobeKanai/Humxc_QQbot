"use strict";
module.exports.config = {
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
  Event: ["message"],
  Keyword: ["关键词", `a+`],
};
module.exports.test = class test {
  constructor(botClient) {
    /** 机器人客户端 */
    this.bot = botClient;
  }
  event(d) {
    console.log("触发");
  }
  keyword(keyWorld, data) {
    console.log("关键词" + keyWorld);
  }
  func1(e) {
    console.log(this);
    this.bot.logger.info("你收到了一条消息:" + e);
  }
  eventTrigger(eventName, e) {
    switch (eventName) {
      case "system.online":
        this.oicq.sendPrivateMsg(2928607724, "我上线啦!");
        break;
      case "message":
        console.log(e);
        break;
      default:
        break;
    }
  }
};
// module.exports.test2 = class test2 {
//   constructor() {
//     super();
//     /** 插件名称 */
//     this.pluginName = "testPlugin2";
//     /** 机器人版本 */
//     this.botVersion = "0.0.1";
//     /** 插件版本 */
//     this.pluginVersion = "1.0.0";
//     /** 描述插件的一些信息 */
//     this.info = "这是用来测试的第二个插件";
//     /** 配置信息,用数组来存储多个配置 */
//     this.config = [pluginConfig];
//     /** 插件运行时数据隔离: "GLOBAL" "PRIVATE"(私聊) "GROUP"(群聊) */
//     this.area = "PRIVATE";
//   }
// };
