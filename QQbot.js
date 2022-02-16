const { isQualifiedName } = require("typescript");
const config = require("./config.js");
const logger = require("log4js").getLogger("BotLoader");
logger.level = config.general.log_level;
const { BotClient, createBot } = require("./lib/core/client");
var bots = new Map();

//从配置分离qq号并放入bots
Object.keys(config).forEach((v) => {
  if (v != "general") bots.set(v);
});

for (const qq of bots.keys()) {
  startBot(qq);
}
//监听重启事件
for (const key of bots.keys()) {
  bots.get(key).on("restart", (qq) => {
    restartBot(qq);
  });
}
function startBot(qq) {
  logger.info(`正在启动机器人 [${qq}]`);
  let bot = createBot(qq, Object.assign(config.general, config[qq]));
  bot.botLogin();
  bots.set(qq, bot);
}
function restartBot(qq) {
  bots.get(qq).shutDown();
  startBot(qq);
}

//加载配置
