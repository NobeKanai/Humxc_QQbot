const https = require("https");
const HttpsProxyAgent = require("https-proxy-agent");
const EventEmitter = require("events");
let path = require("path");
const fs = require("fs");
const { buffer } = require("stream/consumers");
const { inherits } = require("util");
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
  };
  let str =
    '"use strict"\nmodule.exports = ' + JSON.stringify(config, null, "\t");
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
const token = config.token;
//事件管理器
const telegram = new EventEmitter();
//更新消息的间隔
var updateTime = 1000;
var httpsTimeout = 3000;
var update_id;
init();
setInterval(() => {
  getUpdate();
}, updateTime);

telegram.on("message", (message) => {
  console.log(message);
});
function getUpdate() {
  let method = "getUpdates " + update_id;
  getHttp(method).then((update) => {
    telegram.emit("message", JSON.parse(update.toString()));
  });
}
function init() {
  let method = "getUpdates";
  getHttp(method).then((update) => {
    let data = JSON.parse(update.toString());
    update_id = data.result.slice(-1).update_id;
  });
}

function getHttp(method) {
  return new Promise((resolve, reject) => {
    let url = "https://api.telegram.org/bot" + token + "/" + method;
    let ip = config.proxyHost;
    let port = config.proxyPort;
    var option = {
      method: "GET",
      // body: null,
      redirect: "follow", // set to `manual` to extract redirect headers, `error` to reject redirect
      timeout: httpsTimeout, //ms
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
