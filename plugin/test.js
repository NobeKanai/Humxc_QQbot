"use strict";
var plugin = require("./plugin");
module.exports.test = class test extends plugin {
  constructor() {
    super();
    /** 插件名称 */
    this.pluginName = "testPlugin";
    /** 机器人版本 */
    this.botVersion = "0.0.1";
    /** 插件版本 */
    this.pluginVersion = "1.0.0";
    /** 描述插件的一些信息 */
    this.info = "这是用来测试的插件啊";
    /** 配置信息,用数组来存储多个配置 */
    this.config = [pluginConfig];
    /** 插件运行时数据隔离: "GLOBAL" "PRIVATE"(私聊) "GROUP"(群聊) */
    this.area = "GLOBAL";
  }
};
