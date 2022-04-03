import fs from "fs";
import path from "path";
import { BotClient } from "./lib/core/client";
var config: any = undefined;
const logger = require("log4js").getLogger("BotLoader");
const confpath = path.join(__dirname, "config.js");
const { createBot } = require(path.join(__dirname, "lib/core/client"));
var bots: Map<number, BotClient> = new Map();
if (!fs.existsSync(confpath)) {
    fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
    logger.info(`
配置文件不存在，已帮你自动生成，请修改后再次启动程序。
`);
    process.exit(0);
}
config = require(confpath);
logger.level = config.general.log_level;
var botsQq: number[] = [];
//从配置分离qq号并放入bots
Object.keys(config).forEach((v) => {
    if (v != "general") botsQq.push(Number.parseInt(v));
});

for (const qq of botsQq) {
    if (qq > 10000 && qq < 0xffffffff) {
        startBot(qq);
    } else {
        logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
        continue;
    }
}
//监听重启事件
// for (const key of bots.keys()) {
//     let bot = bots.get(key);
//     if (bot != undefined) {
//         bot.on("restart", (qq: any) => {
//             restartBot(qq);
//         });
//     }
// }
function startBot(qq: number) {
    logger.info(`正在启动机器人 [${qq}]`);
    let bot = createBot(qq, Object.assign(config.general, config[qq]));
    bot.botLogin();
    bots.set(qq, bot);
}
// async function restartBot(qq: any) {
//     let bot = bots.get(qq);
//     if (bot != undefined) {
//         await bot.shutDown();
//         startBot(qq);
//     }
// }

//加载配置
