var RconClient = require("rcon");
const { getConfig } = require("../lib/pluginFather");
var defaultConfig={

}
module.exports.PluginConfig = {
  PluginName: "查服",
  BotVersion: "0.0.1",
  PluginVersion: "1.0.0",
  SessionArea: "GLOBAL",
  Info: "使用Rcon对mc服务器进行查服",
  Event: ["system.online", "message.group"],
  Keyword: [`查服`],
};
module.exports.Plugin = class {
  constructor(bot) {
    this.bot = bot;
    this.name = "查服";
    this.rcon = [];
    this.config = getConfig(this, [
      {
        name: "填一个名称",
        ip: "服务器的ip",
        port: "Rcon的端口",
        password: "Rcon的密码",
        group: ["绑定的群组（数组）"],
      },
    ]);
    for (let i = 0; i < this.config.length; i++) {
      const conf = this.config[i];
      this.rcon.push(new rcon(conf));
    }
  }
  keyword(keyword, data) {
    let groupID = data.sender.group_id;
    switch (keyword) {
      case "查服":
        for (let i = 0; i < this.rcon.length; i++) {
          const rcon = this.rcon[i];
          if (new Set(rcon.conf.group).has(groupID)) {
            rcon.listServer();
          }
        }

        break;

      default:
        break;
    }
  }
};
class rcon extends RconClient {
  constructor(conf) {
    super();
    //命令队列
    this.commandList = new Array();
    this.conf = conf;
    this.isOk = false;
    this.autoClose;
    //监听登录
    this.client
      .on("auth", () => {
        this.isOk = true;
        this.autoClose = setTimeout(() => {
          try {
            this.disconnect();
          } catch (err) {
            this.isOk = false;
            console.log(err);
          }
        }, 120000);
      })
      .on("end", () => {
        this.isOk = false;
      })
     
  }
  pushCommand(command,message_id) {
    this.commandList.push({
      command:command,
      message_id=message_id
    });
  }
  sendCommand(command) {
    return new Promise((resolve, reject) => {
  this.send(command)
      this.once("response", (data) => {
        this.removeListener("error");
        resolve(data);
      }).once("error", (err) => {
        this.removeListener("response");
        reject(err);
      });
    });
  }
  waitResponse() {
    return new Promise((r, j) => {
      var id = setTimeout(() => {
        j();
      }, 10000);
      this.client.once("response", (message) => {
        clearTimeout(id);
        r(message);
      });
      this.client.once("error", (message) => {
        clearTimeout(id);
        j();
      });
    });
  }
  listServer(message_id) {
    this.commandList.push([
      message_id,
      "list",
      function (str) {
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
          retstr += playerNumber + "名玩家在线\n  ";
          retstr += /online: (.+)/g.exec(str)[1].replace(/, /g, "\n  ");
        }
        return retstr;
      },
    ]);
    this.client.emit("run");
  }

  say(message_id, str) {
    this.commandList.push([message_id, "say " + str, null]);
    this.client.emit("run");
  }
  停雨(message_id) {
    this.commandList.push([message_id, "weather clear", null]);
    this.client.emit("run");
    console.log("给服务器停雨");
  }
}
class rcon_nobe extends rcon_ {
  constructor(name, rconclient) {
    super(name, rconclient);
  }
  listServer(message_id) {
    this.commandList.push([
      message_id,
      "list",
      function (str) {
        let retstr = "有";
        let playerNumber = /There are §c(\d+)§6 out/g.exec(str)[1];
        if (playerNumber == 0) {
          retstr = 空服回复();
        } else {
          retstr += playerNumber + "名玩家在线\n  ";
          retstr += /§6default§r: (.+)/g
            .exec(str)[1]
            .replace(/§7[AFK]§r/g, "")
            .replace(/§f/g, "")
            .replace(/, /g, "\n  ");
        }
        return retstr;
      },
    ]);
    this.client.emit("run");
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
