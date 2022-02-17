"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var config = undefined;
const logger = require("log4js").getLogger("BotLoader");
const confpath = path_1.default.join(__dirname, "config.js");
const { createBot } = require(path_1.default.join(__dirname, "lib/core/client"));
var bots = new Map();
if (!fs_1.default.existsSync(confpath)) {
    fs_1.default.copyFileSync(path_1.default.join(__dirname, "lib/config.sample.js"), confpath);
    logger.info(`
配置文件不存在，已帮你自动生成，请修改后再次启动程序。
`);
    process.exit(0);
}
config = require(confpath);
logger.level = config.general.log_level;
//从配置分离qq号并放入bots
Object.keys(config).forEach((v) => {
    if (v != "general")
        bots.set(v, undefined);
});
for (const qq of bots.keys()) {
    if (qq > 10000 && qq < 0xffffffff) {
        startBot(qq);
    }
    else {
        logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
        continue;
    }
}
//监听重启事件
for (const key of bots.keys()) {
    if (bots.get(key) != undefined) {
        bots.get(key).on("restart", (qq) => {
            restartBot(qq);
        });
    }
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
