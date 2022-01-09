/*
 * @Author: your name
 * @Date: 2022-01-04 01:09:43
 * @LastEditTime: 2022-01-09 14:42:36
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \QQbot\QQbot.js
 */
const config = require("./config");
const { createClient } = require("oicq");
const fs = require("fs");
var botConfig = config.botConfig;
var oicqConfig = config.oicqConfig;
var bots = new Array();
var command;
var keyworld;
var runtime;
//事件处理
var _event = new Map();
//加载配置
botConfig.forEach((element) => {
  bots.push(init(oicqConfig, element));
});

bots[0].on("system.online", () => console.log("Logged in!"));
bots[0].on("message", (e) => {
  console.log(e);
  if (_event.has("message")) {
    _event.get("message")(e);
  }
});

bots[0]
  .on("system.login.qrcode", function (e) {
    //扫码后按回车登录
    process.stdin.once("data", () => {
      this.login();
    });
  })
  .login();

//初始化oicq客户端
function init(oicqConfig, botConfig) {
  loadPlugin(botConfig.pluginList);
  return createClient(
    botConfig.account,
    Object.assign(oicqConfig.general, oicqConfig[botConfig.account])
  );
}

function loadPlugin(pluginList) {
  if (pluginList[0] == "ALL" && pluginList[1] == undefined) {
    var readDir = fs.readdirSync("./plugin");
    console.log(readDir);
    readDir.forEach((element) => {
      let config = require("./plugin/" + element);
      config.forEach((element) => {
        switch (element.trigger) {
          case "EVENT":
            _event.set(element.eventName, element. method);
            break;

          default:
            break;
        }
      });
    });
  }
}
