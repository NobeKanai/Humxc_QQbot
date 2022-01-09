"use strict";
const fs = require("fs");
const { createClient } = require("oicq");

class client {
  constructor(oicqConfig, botConfig) {
    const admin = new Set(botConfig.admin),
      account = botConfig.account,
      oicqClient = createClient(
        account,
        Object.assign(oicqConfig.general, oicqConfig[botConfig.account])
      );
    var plugin = new Array(),
      run = {
        _event: new Map(),
        keyWord: new Map(),
        command: new Map(),
      };
    this.admin = admin;
    this.account = account;
    this.oicqClient = oicqClient;
    this.plugin = plugin;
    this.run = run;

    //加载插件
    loadPlugin(this.plugin, this.run, botConfig.pluginList, this);
    //登录
    oicqClient
      .on("system.login.qrcode", function (e) {
        //扫码后按回车登录
        process.stdin.once("data", () => {
          this.login();
        });
      })
      .login();
    //事件处理
    oicqClient.on("system.online", () => {
      console.log(account + ":已经登录!");
      if (run._event.has("online")) {
        run._event.get("online").forEach((element) => {
          element(e);
        });
      }
    });
    //收到消息
    oicqClient.on("message", (e) => {
      //触发事件插件
      if (run._event.has("message")) {
        run._event.get("message").forEach((element) => {
          element(e);
        });
      }

      //触发关键词事件
      if (messageType(e) == "text")
        if (run.keyWord.has(e.raw_message))
          run.keyWord.get(e.raw_message).forEach((element) => {
            element(e);
          });

      //触发命令事件
      if (messageType(e) == "COMMAND") {
        let command = parseCommand(e.raw_message);
        if (run.command.has(command[0]))
          run.command.get(command[0]).forEach((element) => {
            element(e, command);
          });
      }
    });
  }
  isAdmin(qq) {
    if (this.admin.has(qq)) return true;
    return false;
  }
  getOicq() {
    return this.oicqClient;
  }
}
//返回消息的类型
function messageType(message) {
  switch (message.message[0].type) {
    case "text":
      if (message.message[0].text[0] == "/") return "COMMAND";
      else return "text";

    default:
      return message.message[0].type;
  }
}
//返回消息是否为群组消息
function isGroup(message) {
  if (message.message_type == "group") return true;
}

//解析命令
function parseCommand(command = "") {
  let str = command.split(" ");
  str[0] = str[0].replace("/", "");
  return str;
}
//加载插件
function loadPlugin(plugin, run, pluginList, client) {
  //如果是“ALL”则加载全部插件
  if (pluginList[0] == "ALL" && pluginList[1] == undefined) {
    let readDir = fs.readdirSync("./plugin");
    console.log(client.account + ":正在加载全部插件，插件目录：" + "plugin");
    readDir.forEach((pluginName) => {
      let pl = require("../../plugin/" + pluginName);
      plugin.push(new pl(client));
    });
  } else {
    console.log(client.account + ":正在加载插件，插件目录：" + "plugin");
    pluginList.forEach((pluginName) => {
      let pl = require("../../plugin/" + pluginName);
      plugin.push(new pl(client));
    });
  }
  //分析插件
  plugin.forEach((element) => {
    console.log("正在准备插件:" + element.name);
    element.config.forEach((element) => {
      switch (element.trigger) {
        //事件触发
        case "EVENT":
          //创建存储方法的数组
          if (!run._event.has(element.eventName))
            run._event.set(element.eventName, new Array());
          run._event.get(element.eventName).push(element.method);
          break;
        case "KEYWORD":
          if (!run.keyWord.has(element.keyWord))
            run.keyWord.set(element.keyWord, new Array());
          run.keyWord.get(element.keyWord).push(element.method);
          break;
        case "COMMAND":
          if (!run.command.has(element.command))
            run.command.set(element.command, new Array());
          run.command.get(element.command).push(element.method);
          break;
        case "RUNTIME":
          element.method();
          break;
      }
    });
  });

  console.log(client.account + ":所有插件加载完成!");
}
module.exports.client = (oicqConfig, botConfig) => {
  return new client(oicqConfig, botConfig);
};
