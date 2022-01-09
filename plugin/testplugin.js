"use strict";
//触发方式：COMMAND,KEYWORLD,RUNTIME(默认),EVENT
//命令权限：ADMIN,NORMAL(默认)
//运行范围：GROBAL,REGIONAL(默认)
class testplugin {
  constructor(client) {
    this.name = "自带插件";
    this.client = client;
    this.oicq = client.getOicq();
    const config = [
      {
        trigger: "EVENT",
        eventName: "message",
        method: this.fun1,
      },
      {
        trigger: "KEYWORD",
        keyWord: "吃饭",
        method: this.fun2,
      },
      {
        trigger: "COMMAND",
        command: "get",
        method: this.fun3,
      },
      {
        trigger: "RUNTIME",
        method: this.fun4,
      },
    ];
    this.config = config;
  }
  getConfig() {
    return this.config;
  }
  //收到消息便回复”Hello World"
  fun1(e) {
    console.log(e);
  }

  fun2(e) {
    e.reply("我来吃饭啦！");
  }
  fun3(e, command) {
    e.reply("运行了命令:" + command);
  }
  fun4() {
    console.log("Hello");
  }
}

module.exports = testplugin;
