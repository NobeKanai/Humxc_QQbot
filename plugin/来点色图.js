"use strict";
var http = require("https");
const { getConig, getData, saveData } = require("../lib/pluginFather");
const path = require("path");

const { segment } = require("oicq");
var defaultConfig = {
  url: "https://awebside.com",
  //发送对象
  sendTo: [
    {
      QQ: "发送对象的qq号码",
      IsGroup: "布尔值，如果是群聊则为true否则为false",
    },
  ],
};
module.exports.PluginConfig = {
  PluginName: "give-me-20-Client",
  BotVersion: "0.0.1",
  PluginVersion: "1.0.0",
  SessionArea: "GLOBAL",
  Info: "抓取give-me-20接口的图片",
  Event: ["system.online", "message.private"],
};
module.exports.Plugin = class {
  constructor(bot) {
    this.name = "give-me-20-Client";
    this.bot = bot;
    this.config = getConig(bot, this.name, defaultConfig);
    this.data = getData(bot, this.name, []);
  }
  event(eventName, data) {
    switch (eventName) {
      case "system.online":
        this.start();
        break;
      case "message.private":
        if (data.sender.user_id == this.bot.uin) {
          this.bot.emit("message_from_self", data);
        }
        break;
      default:
        break;
    }
  }

  start() {
    this.bot.on("messageFromSelf", (message) => {
      console.log(message);
    });
    this.bot.logger.debug("设置任务");
    // test();

    this.getHttp("update")
      .then((list) => {
        this.sendImg(this.hasDifferent(list));
      })
      .catch((error) => {
        this.bot.errorCallAdmin(error);
      });
  }
  getHttp(_path = "") {
    return new Promise((resolve, reject) => {
      let r_url = new URL(_path, this.config.url);
      let reqList = http.request(r_url, (res) => {
        if (_path != "update") {
          res.setEncoding("binary");
        }
        let data = "";
        if (res.statusCode != 200) reject(res.statusCode);
        res.on("data", (d) => {
          //判断格式决定是否解析
          if (res.headers["content-type"].split(";")[0] == "application/json") {
            try {
              data = JSON.parse(d.toString());
            } catch (error) {
              reject(error);
            }
          } else {
            //否则就是二进制
            data += d;
          }
        });
        res.on("end", () => {
          resolve(data);
        });
      });
      reqList.on("error", (error) => {
        reject(error);
      });
      reqList.end();
    });
  }
  hasDifferent(list) {
    let data = new Set(this.data);
    let imgList = [];
    var imgNumber = 0;
    for (let val of list.values()) {
      val = val.replace("\\", "/");
      //val可能为/R16/img.jpg这样的文件名
      let val_base = path.basename(val);
      if (!data.has(val_base)) {
        imgList.push(val);
        this.bot.logger.debug("检测到有新的图片:", val_base);
        imgNumber++;
      }
    }
    this.bot.logger.debug("色图更新成功，共更新" + imgNumber + "张色图");

    if (imgList.length > 0) {
      return imgList;
    } else {
      return false;
    }
  }
  async sendImg(imgNameList) {
    //发送给机器人成功的图片就会存在这里
    var sendSuccessImgList = [];
    //消息发送失败的数量
    var badNumber = 0;
    for (let i = 0; i < imgNameList.length; i++) {
      let imgUrl = this.config.url + "/" + encodeURI(imgNameList[i]);
      let img = segment.image(imgUrl, true);
      //不采取直接单独发，所有消息全部转发
      //全部发送给自己
      this.bot.sendPrivateMsg(this.bot.uin, img).catch((err) => {
        badNumber++;
        this.bot.logger.warn("一张图片发送失败:" + imgNameList[i], err);
      });
      //等待接收到消息
      let pushMsg = await this.waitMessage(
        this.config.url + "/" + imgNameList[i]
      ).catch((err) => {
        this.bot.logger.warn(err);
        badNumber++;
      });
      if (pushMsg != undefined) {
        this.bot.logger.debug("一张图片接收成功:" + imgNameList[i]);
        sendSuccessImgList.push(pushMsg);
        this.flagImg(imgNameList[i]);
      }
    }
    this.bot.logger.info(
      "色图接收完毕，有 " +
        badNumber +
        "/" +
        imgNameList.length +
        " 张色图接收失败"
    );
    //根据图片数量选择发送策略
    if (sendSuccessImgList.length < 4) {
      //消息少的话直接发送给用户
      for (let i = 0; i < sendSuccessImgList.length; i++) {
        let img = sendSuccessImgList[i].message[0];

        for (let i = 0; i < this.config.sendTo.length; i++) {
          const user = this.config.sendTo[i];
          if (user.IsGroup) {
            this.bot.logger.debug(
              "开始将图片发送到群聊:" +
                user.QQ +
                "[" +
                i +
                "/" +
                sendSuccessImgList.length +
                "]"
            );
            await this.bot.sendGroupMsg(user.QQ, img).catch((err) => {
              this.bot.logger.warn("一张图片发送到群聊失败:", err);
            });
          } else {
            this.bot.logger.debug(
              "开始将图片发送到私聊:" +
                user.QQ +
                "[" +
                i +
                "/" +
                sendSuccessImgList.length +
                "]"
            );
            await this.bot.sendPrivateMsg(user.QQ, img).catch((err) => {
              this.bot.logger.warn("一张图片发送到私聊失败:", err);
            });
          }
        }
      }
      if (badNumber > 0)
        this.bot
          .sendPrivateMsg(
            user.QQ,
            "有" + badNumber + "张图片获取失败，没有发送"
          )
          .catch((err) => {
            this.bot.logger.warn(err);
          });
    } else {
      //图片超过4张，制作转发消息再转发
      //插入发送情况
      if (badNumber == 0) {
        this.bot
          .sendPrivateMsg(
            this.bot.uin,
            "好耶！共" + imgNameList.length + "张图片，全部接收成功"
          )
          .catch((err) => {
            this.bot.logger.warn(err);
          });
        sendSuccessImgList.push(
          await this.waitMessage().catch((err) => {
            this.bot.errorCallAdmin(err);
          })
        );
      } else {
        this.bot
          .sendPrivateMsg(
            this.bot.uin,
            "不好！共" +
              imgNameList.length +
              "张图片，有" +
              badNumber +
              "条接收失败"
          )
          .catch((err) => {
            this.bot.errorCallAdmin(err);
          });
        sendSuccessImgList.push(
          await this.waitMessage().catch((err) => {
            this.bot.errorCallAdmin(err);
          })
        );
      }

      //制作转发消息
      let allImgMsg = await this.bot
        .makeForwardMsg(sendSuccessImgList)
        .catch((err) => {
          this.bot.errorCallAdmin("转发消息制作失败" + err);
        });
      //发送转发消息给用户
      if (allImgMsg != undefined)
        for (let i = 0; i < this.config.sendTo.length; i++) {
          const user = this.config.sendTo[i];
          if (user.IsGroup) {
            this.bot.sendGroupMsg(user.QQ, allImgMsg).catch((err) => {
              this.bot.logger.warn("转发消息发送失败:", err);
            });
          } else {
            this.bot.sendPrivateMsg(user.QQ, allImgMsg).catch((err) => {
              this.bot.logger.warn("转发消息发送失败:", err);
            });
          }
        }
    }
    saveData(this.bot, this.name, this.data);
  }
  waitMessage(tips = "") {
    return new Promise((r, j) => {
      var id = setTimeout(() => {
        j("接收图片超时:" + tips);
      }, 20000);
      this.bot.once("message_from_self", (message) => {
        clearTimeout(id);
        r(message);
      });
    });
  }
  //标记图片为已发送
  flagImg(str) {
    if (str != undefined || str != "") {
      let imgName = path.basename(str);
      this.data.push(imgName);
      this.bot.logger.debug("已添加数据:" + imgName);
    }
  }
};
