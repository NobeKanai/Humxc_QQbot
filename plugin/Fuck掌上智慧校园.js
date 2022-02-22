const NodeRSA = require("node-rsa");
const http = require("http");
const { getConfig, saveConfig } = require("../lib/pluginFather");
var defaultConfig = {
  QQ: "用户的qq",
  PhoneNumber: "电话号码(必填)",
  Password: "密码(必填)",
  RoomNum: "APP内的房间号编号(必填)",
  Token: "",
  Studid: "",
  Cardid: "身份证号，不用填，程序会自动获取",
  Waterid: 0000,
  PublicKey: "掌上智慧校园的加密公钥，需要逆向APP查看源码获得",
  APP请求地址前缀: "需要逆向APP查看源码获得",
  水表关阀接口: "需要逆向APP查看源码获得",
  水表开阀接口: "需要逆向APP查看源码获得",
  水表用量接口: "需要逆向APP查看源码获得",
  登录接口: "需要逆向APP查看源码获得",
};

module.exports.PluginConfig = {
  PluginName: "Fuck掌上智慧校园",
  BotVersion: "0.0.1",
  PluginVersion: "1.0.0",
  SessionArea: "GLOBAL",
  Info: "用来控制学校的水阀",
  Event: ["system.online"],
  Keyword: ["^开水", "^关水"],
};
module.exports.Plugin = class {
  constructor(bot) {
    this.inited = false;
    this.userMoney = 0;
    this.balance = 0;
    this.intervalID = 0;
    this.name = "Fuck掌上智慧校园";
    this.bot = bot;
    this.config = getConfig(this, defaultConfig);
  }

  event(eventName) {
    switch (eventName) {
      case "system.online":
        this.init();
        break;
    }
  }
  keyword(keyword, data) {
    if (data.sender.user_id == this.config.QQ) {
      switch (keyword) {
        case "^开水":
          this.开水()
            .then((resp) => {
              if (resp != undefined || resp != "")
                this.bot.sendPrivateMsg(this.config.QQ, resp).catch((err) => {
                  this.bot.logger.error(err);
                });
            })
            .catch((err) => {
              this.bot.logger.warn(this.name + ":" + err);
            });

          break;

        case "^关水":
          this.关水()
            .then((resp) => {
              if (resp != undefined || resp != "")
                this.bot.sendPrivateMsg(this.config.QQ, resp).catch((err) => {
                  this.bot.logger.error(err);
                });
            })
            .catch((err) => {
              this.bot.logger.warn(this.name + ":" + err);
            });

          break;
      }
    }
  }
  特殊原因关水(msg, flag) {
    if (flag == true) {
      clearInterval(this.intervalID);
    }
    this.bot
      .sendPrivateMsg(
        this.config.QQ,
        `${msg}\n本次消费澡币:${this.userMoney}\n澡币余额:${this.balance}`
      )
      .catch((err) => {
        this.bot.logger.error(err);
      });
  }
  async init() {
    if (
      this.config.Studid == "" ||
      this.config.Token == "" ||
      this.config.Cardid == ""
    ) {
      await this.login().catch((err) => {
        this.bot.logger.info(this.name + ":初始化登录失败");
        this.bot.logger.error(err);
      });
    }
    this.bot.logger.info(this.name + ":初始化成功");
    this.inited = true;
  }
  async login() {
    let param = 加密和编码(
      `{"switc":"1","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
      this.config.PublicKey
    );
    let data = `param=${param}&userinfo=${this.config.PhoneNumber}&password=${this.config.Password}`;
    let json = await sendPose(
      this.config.APP请求地址前缀,
      this.config.登录接口,
      data
    ).catch((err) => {
      throw err;
    });
    this.config.Token = json.rows[0].token;
    this.config.Studid = json.rows[0].studentID;
    this.config.Cardid = json.rows[0].cardid;
    saveConfig(this);
  }
  async 查询用量() {
    if (!this.inited) {
      this.bot.logger.warn(this.name + ":初始化未完成，未查询用量");
    }
    let param = 加密和编码(
      `{"Studid":"${
        this.config.Studid
      }","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
      this.config.PublicKey
    );
    let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&waterid=${this.config.Waterid}`;
    let json = await sendPose(
      this.config.APP请求地址前缀,
      this.config.水表用量接口,
      data
    ).catch((err) => {
      throw err;
    });

    if (json.code == "1") {
      this.userMoney += json.rows[0].usermoney;
      this.balance = json.rows[0].balance;
      switch (json.rows[0].userflag) {
        case "2":
          throw new Error("你的账户余额已不足");

        case "3":
          throw new Error("5分钟内未使用热水");

        case "4":
          throw new Error("单次最多使用30分钟");

        case "5":
          throw new Error("用户已点击结算");

        case "6":
          throw new Error("单次使用超过最大金额限制");
        default:
          if (this.userMoney > 5) {
            this.bot
              .sendPrivateMsg(this.config.QQ, "本次用水已经超过5元!")
              .catch((err) => {
                this.bot.logger.error(err);
              });
          }
          break;
      }
    } else {
      this.bot.logger.warn(this.name + ":查询失败:\n", json);
    }
  }
  async 开水() {
    this.userMoney = 0;
    let resp = "未知回复";
    if (!this.inited) {
      this.bot.logger.info(this.name + ":初始化未完成，5秒后重试");
      setTimeout(() => {
        this.开水()
          .then((resp) => {
            return resp;
          })
          .catch((err) => {
            throw err;
          });
      }, 5000);
      return;
    }
    let param = 加密和编码(
      `{"Studid":"${
        this.config.Studid
      }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
      this.config.PublicKey
    );
    let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&RoomNum=${this.config.RoomNum}`;
    let json = await sendPose(
      this.config.APP请求地址前缀,
      this.config.水表开阀接口,
      data
    ).catch((err) => {
      throw err;
    });
    switch (json.code) {
      case "1":
        if (this.config.Waterid != json.rows[0].waterid) {
          this.config.Waterid = json.rows[0].waterid;
          saveConfig(this);
        }
        if (json.rows[0].info == "OPENOK") {
          resp = "水阀:" + json.rows[0].dormitory + " 被成功开启";
          this.bot.logger.info(this.name + ":开启水阀");
          this.intervalID = setInterval(() => {
            this.查询用量().catch((err) => {
              this.特殊原因关水(err.message, true);
            });
          }, 20000);
        }
        break;
      case "12342":
        //登录信息过期
        await this.login();
        return await this.开水().catch((err) => {
          throw err;
        });

      case "007":
        resp = json.message;
        break;
    }

    return resp;
  }
  async 关水() {
    let resp = "未知回复";
    if (!this.inited) {
      this.bot.logger.info(this.name + ":初始化未完成，5秒后重试");
      setTimeout(() => {
        this.关水()
          .then((resp) => {
            return resp;
          })
          .catch((err) => {
            throw err;
          });
      }, 5000);
    }
    clearInterval(this.intervalID);
    await this.查询用量().catch((err) => {
      this.特殊原因关水(err.message);
      throw err;
    });
    let param = 加密和编码(
      `{"Studid":"${
        this.config.Studid
      }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
      this.config.PublicKey
    );
    let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&RoomNum=${this.config.RoomNum}&waterid=${this.config.Waterid}`;

    let json = await sendPose(
      this.config.APP请求地址前缀,
      this.config.水表关阀接口,
      data
    ).catch((err) => {
      throw err;
    });

    switch (json.code) {
      case "1":
        if (json.rows[0].info == "CLOSEOK") {
          resp =
            "成功关闭\n本次消费澡币:" +
            this.userMoney +
            "\n剩余澡币:" +
            this.balance;
          this.bot.logger.info(this.name + ":关闭水阀");
        }
        break;
      case "12342":
        //登录信息过期
        await this.login();
        return await this.关水().catch((err) => {
          throw err;
        });

      case "007":
        resp = json.message;
        break;
    }

    return resp;
  }
};

function getOnlyID() {
  //随机字符串：时间戳 + 取3次随机数（11111, 9999999）拼接
  return (
    new Date().getTime().toString() +
    GetRandomNum(11111, 9999999).toString() +
    GetRandomNum(11111, 9999999).toString() +
    GetRandomNum(11111, 9999999).toString()
  );
}
function getCodeingTime() {
  //时间戳substring(0, 10)
  return new Date().getTime().toString().substring(0, 10);
}
function GetRandomNum(Min, Max) {
  var Range = Max - Min;
  var Rand = Math.random();
  return Min + Math.round(Rand * Range);
}

function 加密和编码(data, publicKey) {
  const a_public_key = new NodeRSA(publicKey);
  a_public_key.setOptions({ encryptionScheme: "pkcs1" });
  return encodeURIComponent(a_public_key.encrypt(data, "base64"));
}

function sendPose(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 52119,
      path: path,
      method: "POST",
      headers: {
        "Content-Length": data.length,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; HUAWEI P20)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
      },
    };

    const req = http.request(options, (res) => {
      res.on("data", (d) => {
        // console.log(d.toString());
        resolve(JSON.parse(d.toString()));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}
