/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-01
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\QQbot.ts
 * @Description:应用程序入口，创建和管理所有的账户
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import { Client, PluginManager } from "./lib/index";
import log4js from "log4js";
const logger = log4js.getLogger("BotFather");
var config: any = undefined;
const confpath = path.join(__dirname, "config.js");
var bots: Map<number, Client> = new Map();

main();
async function main() {
    if (!fs.existsSync(confpath)) {
        fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
        console.log("配置文件不存在，已帮你自动生成，请修改后再次启动程序。");
        return;
    }
    config = require(confpath);
    // 导入插件
    PluginManager.load();
    // 设置日志
    logger.level = config.general.log_level;
    if (config.general.save_log_file === true)
        log4js.configure({
            appenders: {
                production: {
                    type: "dateFile",
                    filename: "log/bot.log",
                    alwaysIncludePattern: true,
                    keepFileExt: true,
                    numBackups: 30,
                },
            },
            categories: {
                default: { appenders: ["production"], level: "debug" },
            },
        });

    var botsid: number[] = [];
    //从配置分离qq号并放入bots
    Object.keys(config).forEach((v) => {
        if (v != "general") botsid.push(Number.parseInt(v));
    });

    for (const qq of botsid) {
        if (qq > 10000 && qq < 0xffffffff) {
            logger.info(`正在启动机器人 [${qq}]`);
            let bot: Client;
            try {
                bot = new Client(qq, Object.assign(config.general, config[qq]));
            } catch (error) {
                logger.error(`创建客户端失败:`, error);
                return;
            }
            await bot.start();
            bots.set(qq, bot);
        } else {
            logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
            continue;
        }
    }
}
