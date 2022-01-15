"use strict";
const plugin = require("./plugin");
const { Client } = require("oicq")
module.exports.test = class test extends plugin {
  constructor(botClient) {
    super();
    /** 插件名称 */
    this.pluginName = "testPlugin";
    /** 机器人版本 */
    this.botVersion = "0.0.1";
    /** 插件版本 */
    this.pluginVersion = "1.0.0";
    /** 描述插件的一些信息 */
    this.info = "这是用来测试的插件啊";
    /** 机器人客户端 */
    this.bot = botClient
    /** Oicq客户端 */
    this.oicq = botClient.getOicq()
    /** 配置信息,用数组来存储多个配置 */
    this.config = [{
      trigger: "EVENT",
      _event: ["message", "system.online"]

    }];
    /** 插件运行时数据隔离: "GLOBAL" "PRIVATE"(私聊) "GROUP"(群聊) */
    this.area = "GLOBAL";
  }
  func1(e) {
    console.log("你tm收到了一条消息:" + e.message);

  }
  eventTrigger(eventName, e) {
    switch (eventName) {
      case "system.online":
        this.oicq.sendPrivateMsg(2928607724, "我上线啦!")
        break;
      case "message":
        console.log(e)
        break
      default:
        break;
    }

  }
};
module.exports.test2 = class test2 extends plugin {
  constructor() {
    super();
    /** 插件名称 */
    this.pluginName = "testPlugin2";
    /** 机器人版本 */
    this.botVersion = "0.0.1";
    /** 插件版本 */
    this.pluginVersion = "1.0.0";
    /** 描述插件的一些信息 */
    this.info = "这是用来测试的第二个插件";
    /** 配置信息,用数组来存储多个配置 */
    this.config = [pluginConfig];
    /** 插件运行时数据隔离: "GLOBAL" "PRIVATE"(私聊) "GROUP"(群聊) */
    this.area = "PRIVATE";
  }
};
