/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\plugin\manager.ts
 * @Description:提供插件的加载，获取等功能
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import path from "path";
import fs from "fs";
import { BotPlugin, BotPluginProfile, BotPluginClass, BotPluginProfileClass } from "./plugin";
import { getLogger, levels } from "log4js";
import { util } from "..";
var logger = getLogger("PluginManager");
logger.level = levels.ALL;
export class PluginManager {
    // 存放插件的目录
    public static pluginFolder: string = path.join(require?.main?.path || process.cwd(), "plugins");
    private constructor() {}
    private static readonly plugins: Map<string, [BotPluginProfileClass, BotPluginClass]> = new Map<
        string,
        [BotPluginProfileClass, BotPluginClass]
    >();

    /**
     * @description: 加载 plugins 文件夹下的所有插件类。
     */
    public static load(showLog: boolean = true) {
        if (showLog === false) {
            logger.level = levels.OFF;
        }
        util.mkDirsSync(this.pluginFolder);
        logger.mark("====== 准备插件 ======");
        // 插件文件的存放相对路径，相对与 "plugins" 文件夹
        let pluginPaths: string[] = [];
        if (!fs.existsSync(this.pluginFolder)) {
            fs.mkdirSync(this.pluginFolder);
        }
        // 加载插件目录下所有文件
        fs.readdirSync(this.pluginFolder).forEach((fileName: string) => {
            let stat = fs.lstatSync(path.join(this.pluginFolder, fileName));
            if (/\.d\.ts/.exec(fileName) != null) return;
            if (stat.isFile()) {
                if (/\.js$/.exec(fileName) != null || /\.ts/.exec(fileName)) {
                    pluginPaths.push(fileName);
                    return;
                }
            } else {
                // 如果是文件夹，则加载文件夹下与文件夹同名的文件
                let file = path.join(this.pluginFolder, fileName, fileName);
                if (fs.existsSync(file + ".js") || fs.existsSync(file + ".ts")) {
                    pluginPaths.push(path.join(fileName, fileName));
                }
            }
        });
        for (let i = 0; i < pluginPaths.length; i++) {
            const pluginPath = pluginPaths[i];
            logger.mark(`正在导入插件 [${pluginPath}]`);
            let plugin: any | undefined = undefined;
            try {
                plugin = require(path.join(this.pluginFolder, pluginPath));
            } catch (error) {
                logger.error("导入插件时出现错误，已跳过该插件:", error);
                continue;
            }
            if (plugin != undefined) {
                if (plugin.Profile === undefined) {
                    logger.error("插件缺少必须的导出类: Profile, 将不会加载此插件。");
                    continue;
                }
                if (plugin.Plugin === undefined) {
                    logger.error("插件缺少必须的导出类: Plugin, 将不会加载此插件。");
                    continue;
                }

                try {
                    let pluginProfile: BotPluginProfile = new plugin.Profile();
                    if (pluginProfile.Name === undefined || pluginProfile.Name === "") {
                        logger.error("Profile 缺少必须的属性: Name, 将不会加载此插件。");
                        continue;
                    }
                    logger.mark(`Name: ${pluginProfile.Name}`);
                    logger.mark(`PluginVersion: ${pluginProfile.PluginVersion}`);
                    logger.mark(`BotVersion: ${pluginProfile.BotVersion}`);
                    logger.mark(`Info: ${pluginProfile.Info}`);
                    this.plugins.set(pluginProfile.Name, [plugin.Profile, plugin.Plugin]);
                    logger.mark("=====================");
                } catch (error) {
                    logger.error("装载插件时出现错误，已跳过该插件\n", error);
                    continue;
                }
            }
        }
    }

    /**
     * @description: 根据插件名称获取插件的类
     * @param {string[]} pluginName - 插件的名称，在插件 Profile 类中的 Name 字段
     * @return {[BotPluginProfileClass, BotPluginClass][] | undefined} 如果插件不存在则返回 undefined
     */
    public static getPlugins(...pluginName: string[]): [BotPluginProfileClass, BotPluginClass][] {
        let result: [BotPluginProfileClass, BotPluginClass][] = [];
        for (let i = 0; i < pluginName.length; i++) {
            const name = pluginName[i];
            if (this.plugins.has(name)) {
                //@ts-ignore
                result.push(this.plugins.get(name));
            }
        }
        return result;
    }

    /**
     * @description: 获取已加载的所有插件类
     * @return {[BotPluginProfileClass, BotPluginClass]} 已加载的所有插件类的元组: [插件名称，插件类]
     */
    public static getAllPlugins(): [BotPluginProfileClass, BotPluginClass][] {
        let result: [BotPluginProfileClass, BotPluginClass][] = [];
        for (const pluginName of this.plugins.keys()) {
            if (this.plugins.has(pluginName)) {
                //@ts-ignore
                result.push(this.plugins.get(pluginName));
            }
        }
        return result;
    }
}
