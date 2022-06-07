/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-01
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\QQbot.ts
 * @Description:应用程序入口，创建和管理所有的账户
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import { BotPluginClass, BotPluginProfileClass, Client, PluginManager, util } from "./lib/index";
import log4js from "log4js";
import * as child_process from "child_process";
import { serialize, Serializer } from "v8";

const args = process.argv.slice(2);
if (args[0] === "child") {
    let uid = Number.parseInt(args[1]);
    let config = JSON.parse(args[2]);
    child(uid, config);
} else {
    main();
}

/** 主进程 */
async function main() {
    const logger = log4js.getLogger("BotFather");
    logger.level = log4js.levels.ALL;
    var config: any = undefined;
    const confpath = path.join(require?.main?.path || process.cwd(), "config.js");
    var bots: Map<number, Client> = new Map();

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

    // 从配置分离qq号并放入botsis
    var botsid: number[] = [];
    Object.keys(config).forEach((v) => {
        if (v != "general") botsid.push(Number.parseInt(v));
    });

    // 启动机器人客户端

    for (const qq of botsid) {
        if (qq > 10000 && qq < 0xffffffff) {
            let uid = qq;
            let conf = Object.assign(config.general, config[qq]);
            await startBot(uid, conf);
        } else {
            logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
            continue;
        }
    }

    function startBot(uid: number, config: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // 子进程启动机器人
            if (config.child_process === true) {
                logger.info(`正在从子进程中启动机器人 [${uid}]`);
                let a = PluginManager.getAllPlugins();
                let child = child_process.fork(__filename, [
                    "child",
                    uid.toString(),
                    JSON.stringify(config),
                    PluginManager.getAllPlugins().toString(),
                ]);

                child.on("close", (code) => {
                    logger.info(`子进程关闭 [${uid}] code=${code}`);
                });
                child.on("message", (msg) => {
                    if (msg === "bot_is_started") {
                        resolve();
                    }
                });
            } else {
                // 主进程启动机器人
                new Client(uid, config).start();
            }
        });
    }
}

/** 子进程 */
async function child(uid: number, config: any) {
    PluginManager.load(false);
    var bot: Client = new Client(uid, config);
    await bot.start();
    if (process.send) process.send("bot_is_started");
}
