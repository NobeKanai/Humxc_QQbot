const https = require("https");
const HttpsProxyAgent = require("https-proxy-agent");
const EventEmitter = require("events");
let path = require("path");
const fs = require("fs");
const dataPath = "./plugin_data/telegram_forwarder";

try {
  var config = require(path.resolve(dataPath) + "/config");
} catch (error) {
  console.log(error);
  console.log("配置文件发生错误，正在重置配置文件，请修改后再次运行。");
  let config = {
    token: "",
    proxyHost: "",
    proxyPort: "",
    qq: "",
    qqChat: "",
    tgChat: "",
  };
  let str =
    '"use strict"\n  //qq: 提醒人的qq号\n//qqChat: 被转发的qq群聊群号\n//tgChat:将消息转发到该tg号\n  module.exports = ' +
    JSON.stringify(config, null, "\t");
  let _path = path.resolve(dataPath) + "/config.js";

  try {
    if (!fs.existsSync(path.resolve(dataPath))) {
      fs.mkdirSync(path.resolve(dataPath));
    }
  } catch (err) {
    console.error(err);
  }
  fs.writeFileSync(_path, str, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    //文件写入成功。
  });
  process.exit(1);
}
class telegram {
  constructor(config) {
    const token = config.token;
    //事件管理器
    const telegram = new EventEmitter();
    this.proxyHost = config.proxyHost;
    this.proxyPort = config.proxyPort;
    this.qqChat = config.qqChat;
    this.tgChat = config.tgChat;
    this.qq = config.qq;
    this.token = token;
    this.telegram = telegram;
    this.updateTime = 10000; //更新消息的间隔
    this.httpsTimeout = 3000;
    this.update_id;
    this.init();
    setInterval(() => {
      this.getUpdate();
    }, this.updateTime);

    telegram.on("message", (message) => {
      console.log(message);
    });
  }
  forward(str, at_qq) {
    if (this.qq == at_qq) {
      str = "🔸有人at了你🔸\n" + str;
      this.sendMessage(this.tgChat, encodeURI(str), false);
    } else {
      this.sendMessage(this.tgChat, encodeURI(str), true);
    }
  }
  sendMessage(chat_id, str, disable_notification = true) {
    let method =
      "sendMessage?chat_id=" +
      chat_id +
      "&text=" +
      str +
      "&disable_notification=" +
      disable_notification;
    this.getHttp(method);
  }
  getUpdate() {
    let method = "getUpdates?offset=-1";
    this.getHttp(method).then((update) => {
      let data = JSON.parse(update.toString());
      if (data.result[0].update_id != this.update_id) {
        this.update_id = data.result[0].update_id;
        this.telegram.emit("message", data.result[0].message);
      }
    });
  }
  init() {
    let method = "getUpdates";
    this.getHttp(method).then((update) => {
      let data = JSON.parse(update.toString());
      this.update_id = data.result.slice(-1)[0].update_id;
    });
  }
  getHttp(method) {
    return new Promise((resolve, reject) => {
      let url = "https://api.telegram.org/bot" + this.token + "/" + method;
      let ip = this.proxyHost;
      let port = this.proxyPort;
      var option = {
        method: "GET",
        // body: null,
        redirect: "follow", // set to `manual` to extract redirect headers, `error` to reject redirect
        timeout: this.httpsTimeout, //ms
        agent: new HttpsProxyAgent("http://" + ip + ":" + port), //<==注意是 `http://`
      };
      https
        .get(url, option, (res) => {
          // console.log("statusCode:", res.statusCode);
          // console.log("headers:", res.headers);

          res.on("data", (d) => {
            resolve(d);
          });
        })
        .on("error", (e) => {
          reject(e);
          console.error(e);
        });
    });
  }
}
const tg = new telegram(config);
function getTG() {
  return tg;
}
class plugin {
  constructor(client) {
    this.name = "TG捎信人";
    this.client = client;
    this.oicq = client.getOicq();
    this.tg = getTG();
    const config = [
      {
        trigger: "EVENT",
        eventName: "message",
        method: this.fun1,
      },
    ];
    this.config = config;
  }
  fun1(e) {
    let str = "";
    str += e.sender.nickname + ":\n";
    str += e.raw_message;
    let at_qq;
    if (e.message[0].type == "at") at_qq = e.message[0].qq;
    tg.forward(str, at_qq);
  }
}
module.exports = plugin;
