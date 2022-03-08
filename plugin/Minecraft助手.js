var RconClient = require("rcon");
var http = require("http");
var url = require("url")
const { getConfig } = require("../lib/pluginFather");
var defaultConfig = {
  name: "填一个名称",
  ip: "服务器的ip",
  port: "Rcon的端口",
  password: "Rcon的密码",
  group: ["绑定的群组（数组）"],
};
module.exports.PluginConfig = {
  PluginName: "Minecraft助手",
  BotVersion: "0.0.1",
  PluginVersion: "1.0.0",
  SessionArea: "GLOBAL",
  Info: "使用Rcon与MC服务器进行交互",
  Keyword: ["^查服", "^mc "],
};
module.exports.Plugin = class {
  constructor(bot) {
    this.bot = bot;
    this.name = "Minecraft助手";
    this.config = getConfig(this, defaultConfig);
    this.rcon = new rcon(
      this.config.host,
      parseInt(this.config.port),
      this.config.password
    );
  this.startserver();
  }
  startserver(){
    http.createServer(function (request, response) {
      // 发送 HTTP 头部
      // HTTP 状态值: 200 : OK
      // 内容类型: text/plain
      response.writeHead(200, { "Content-Type": "text/plain" });
  
      // 发送响应数据 "Hello World"
      response.end("Ok");
      var urlObj = url.parse(request.url, true);
      var query = urlObj.query;
      let msg =decodeURI(query.message);
     this.bot. sendGroupMsg(this.config.group[0],msg).catch(e=>console.log(e))
  
    })
    .listen(8090);
  }
  keyword(keyword, data) {
    if (new Set(this.config.group).has(data.group_id)) {
      switch (keyword) {
        case "^查服":
          this.rcon
            .sendCmd("list")
            .then((msg) => {
              data.reply(parseList(msg)).catch((err) => {
                console.log(err);
              });
            })
            .catch((msg) => {
              data.reply(msg).catch((err) => {
                console.log(err);
              });
            });
          break;

        case "^mc ": {
          let msg =
            "§b<" +
            data.sender.card +
            ">§e " +
            data.raw_message.substr(3, data.raw_message.length + 1);
          this.rcon.sendCmd("say " + msg).catch((msg) => {
            data.reply(msg).catch((err) => {
              console.log(err);
            });
          });
        }
      }
    }
  }

};
class rcon extends RconClient {
  constructor(host, port, password, options) {
    super(host, port, password, options);
    //settime id
    this.autoCloseID = undefined;
  }
  //设置自动断开连接
  autoClose() {
    if (this.autoCloseID != undefined) {
      clearTimeout(this.autoCloseID);
      this.autoCloseID = undefined;
    }
    this.autoCloseID = setTimeout(() => {
      this.ok = false;
      this.disconnect();
    }, 120000);
  }

  //登录/连接
  login() {
    return new Promise((resolve, reject) => {
      if (!this.hasAuthed) {
        this.once("auth", () => {
          resolve();
        });
        this.once("error", (err) => {
          reject(err);
        });
        this.once("server", (err) => {
          reject(err);
        });
        this.connect();
      } else resolve();
    });
  }

  //发送指令
  sendCmd(command) {
    return new Promise((resolve, reject) => {
      this.login()
        .then(() => {
          this.send(command);
        })
        .catch((err) => {
          reject(err.message);
        });

      this.once("error", (err) => {
        reject(err.message);
      }).once("response", (msg) => {
        resolve(msg);
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
  let a = parseInt(Math.random() * 回复.length, 10);
  return 回复[a];
}
function parseList(str) {
  console.log(str);
  let retstr = "有";
  let playerNumber = "";
  try {
    playerNumber = /There are (\d+) of/g.exec(str)[1];
  } catch (err) {
    console.log(err);
    retstr = "回复错误？请重试";
    return retstr;
  }
  if (playerNumber == 0) {
    retstr = 空服回复();
  } else {
    retstr += playerNumber + "名玩家在线\n- ";
    retstr += /online: (.+)/g.exec(str)[1].replace(/, /g, "\n- ");
  }
  return retstr;
}
