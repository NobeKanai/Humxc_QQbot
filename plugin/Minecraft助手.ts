import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig, LoadArea } from "../lib/plugin";

var RconClientBase = require("rcon");
import http, { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { getConfig } from "../lib/pluginFather";
var defaultConfig = {
  name: "填一个名称",
  ip: "服务器的ip",
  port: "Rcon的端口",
  password: "Rcon的密码",
  group: ["绑定的群组（数组）"],
};
export class PluginConfig implements BotPluginConfig {
  LoadArea: LoadArea = "GLOBAL";
  Event?: string[] | undefined;
  PluginName = "Minecraft助手";
  BotVersion = "0.0.1";
  PluginVersion = "1.0.0";
  Info = "使用Rcon与MC服务器进行交互";
  Keyword = ["^查服", "^mc "];
}
export class Plugin extends BotPlugin {
  private rcon: Rcon;
  constructor(botClient: BotClient) {
    super(botClient, new PluginConfig());
    this.config = getConfig(this, defaultConfig);
    this.rcon = new Rcon(
      this.config.host,
      parseInt(this.config.port),
      this.config.password
    );
    this.startserver();
  }
  startserver() {
    var token = "kxnd9injHJKfe55wcds";
    http.createServer((request: IncomingMessage, response: ServerResponse) => {
      response.writeHead(200, { "Content-Type": "text/plain" });
      if (request.url != undefined) {
        var urlObj: url.UrlWithParsedQuery = url.parse(request.url, true);
        var query = urlObj.query;
        if (query.token == token) {
          response.end("Ok");
          if (query.msg != undefined && query.msg != "")
            this.bot
              .sendGroupMsg(this.config.group[0], query.msg)
              .catch((e) => console.log(e));
          else this.logger.warn("服务器发来的消息为空: " + request.url);
        }
      } else this.logger.error("request.url == undefined");
    });
  }
  async keyword(keyword: string, data: any) {
    if (new Set(this.config.group).has(data.group_id)) {
      switch (keyword) {
        case "^查服":
          try {
            let msg = await this.rcon.sendCmd("list");
            await data.reply(parseList(msg));
          } catch (error) {
            data.reply(error).catch((e: any) => this.logger.error(e));
          }
          break;

        case "^mc ": {
          let msg = `§b<${data.sender.card}>§f ${data.raw_message.substr(
            3,
            data.raw_message.length + 1
          )}`;
          try {
            await this.rcon.sendCmd("say " + msg);
          } catch (error) {
            this.logger.error(error);
          }
        }
      }
    }
  }
}
class Rcon extends RconClientBase {
  private autoCloseID: NodeJS.Timeout | undefined;
  private callbackList: Map<string, { cancelName: string; func: Function }[]> =
    new Map();
  constructor(host: string, port: number, password: string, options?: any) {
    super(host, port, password, options);
    this.on("error", (err: any) => {
      if (err == "write after end") this.disconnect();
      let list = this.callbackList.get("error");
      if (list?.length == 0) {
        console.log("没有捕获的错误:" + err);
        return;
      }
      if (list != undefined) var obj = list.shift();
      if (obj != undefined) {
        obj.func(err);
        this.callbackList.get(obj.cancelName)?.shift();
      }
    });
    this.on("server", (err: any) => {
      let list = this.callbackList.get("error");
      if (list?.length == 0) {
        console.log("没有捕获的错误:" + err);
        return;
      }
      if (list != undefined) var obj = list.shift();
      if (obj != undefined) {
        obj.func(err);
        this.callbackList.get(obj.cancelName)?.shift();
      }
    });
    this.on("auth", () => {
      console.log("登录了");
      let list = this.callbackList.get("auth");
      if (list?.length == 0) {
        return;
      }
      if (list != undefined) var obj = list.shift();
      if (obj != undefined) {
        obj.func();
        this.callbackList.get(obj.cancelName)?.shift();
      }
    });
    this.on("response", (res: any) => {
      let list = this.callbackList.get("response");
      if (list?.length == 0) {
        console.log("没有捕获的回复:" + res);
        return;
      }
      if (list != undefined) var obj = list.shift();
      if (obj != undefined) {
        obj.func(res);
        this.callbackList.get(obj.cancelName)?.shift();
      }
    });
  }
  //设置自动断开连接
  autoClose() {
    if (this.autoCloseID != undefined) {
      clearTimeout(this.autoCloseID);
      this.autoCloseID = undefined;
    }
    this.autoCloseID = setTimeout(() => {
      this.disconnect();
    }, 120000);
  }

  //登录/连接
  async login() {
    this.autoClose();
    if (!this.hasAuthed) {
      this.connect();
      try {
        await this.setFeedBack("auth", "error");
      } catch (error) {
        throw error;
      }
    } else return;
  }

  //发送指令
  async sendCmd(command: string): Promise<any> {
    try {
      await this.login();
    } catch (error) {
      throw error;
    }
    this.send(command);
    try {
      return await this.setFeedBack("response", "error");
    } catch (error) {
      throw error;
    }
  }
  setFeedBack(resolveName: string, rejectName: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.callbackList.has(resolveName)) {
        this.callbackList.set(resolveName, []);
      }
      this.callbackList.get(resolveName)?.push({
        cancelName: rejectName,
        func: resolve,
      });
      if (!this.callbackList.has(rejectName)) {
        this.callbackList.set(rejectName, []);
      }
      this.callbackList.get(rejectName)?.push({
        cancelName: resolveName,
        func: reject,
      });
    });
  }
}

function 空服回复() {
  let 回复 = [
    "没人在线(；′⌒`)",
    "大伙都不敢玩，说是有人在服务器里下毒",
    "怎么都不玩啊，这服务器十分的珍贵",
    "tnnd!玩啊!为什么不玩",
    "你这服务器多少钱一斤啊，怎么没人玩",
  ];
  let a = parseInt((Math.random() * 回复.length).toString(), 10);
  return 回复[a];
}
function parseList(str: string) {
  console.log(str);
  let retstr = "有";
  let playerNumber: string = "0";
  try {
    let reg = /There are (\d+) of/g.exec(str);
    if (reg != null) playerNumber = reg[1];
    else retstr = "出现异常: playerNumber==null";
  } catch (err) {
    console.log(err);
    retstr = "回复错误？请重试";
    return retstr;
  }
  if (playerNumber == "0") {
    retstr = 空服回复();
  } else {
    retstr += playerNumber + "名玩家在线\n- ";
    let reg = /online: (.+)/g.exec(str);
    if (reg != null) retstr += reg[1].replace(/, /g, "\n- ");
    else retstr = 空服回复();
  }
  return retstr;
}
