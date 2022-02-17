import fs from "fs";
import path from "path";
var config: any = undefined;
const logger = require("log4js").getLogger("BotLoader");
const confpath = path.join(__dirname, "config.js");
const { createBot } = require(path.join(__dirname, "lib/core/client"));
var bots = new Map();
if (!fs.existsSync(confpath)) {
  fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
  logger.info(`
配置文件不存在，已帮你自动生成，请修改后再次启动程序。
`);
  process.exit(0);
}
config = require(confpath);
logger.level = config.general.log_level;
//从配置分离qq号并放入bots
Object.keys(config).forEach((v) => {
  if (v != "general") bots.set(v, undefined);
});

for (const qq of bots.keys()) {
  if (qq > 10000 && qq < 0xffffffff) {
    startBot(qq);
  } else {
    logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
    continue;
  }
}
//监听重启事件
for (const key of bots.keys()) {
  if (bots.get(key) != undefined) {
    bots.get(key).on("restart", (qq: any) => {
      restartBot(qq);
    });
  }
}
function startBot(qq: string) {
  logger.info(`正在启动机器人 [${qq}]`);
  let bot = createBot(qq, Object.assign(config.general, config[qq]));
  bot.botLogin();
  bots.set(qq, bot);
}
function restartBot(qq: any) {
  bots.get(qq).shutDown();
  startBot(qq);
}

//加载配置
