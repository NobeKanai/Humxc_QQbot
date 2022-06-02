/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\plugin\manager.ts
 * @Description:提供插件的加载，获取等功能
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import path from "path";
import fs from "fs";
import { Plugin, PluginProfile } from "./plugin";
// 存放插件的文件夹
var pluginFolder = path.join(process.cwd(), "plugins");
export class PluginManager {
    private constructor() {}
    public static readonly plugins: Map<string, Plugin> = new Map<string, Plugin>();
    private static logger = require("log4js").getLogger("PluginManager");
    public static load() {
        this.logger.info("====== 准备插件 ======");
        let pluginPaths: string[] = [];
        if (!fs.existsSync(pluginFolder)) {
            fs.mkdirSync(pluginFolder);
        }
        // 加载插件目录下所有文件
        fs.readdirSync(pluginFolder).forEach((fileName: string) => {
            let stat = fs.lstatSync(fileName);
            if (/\.d\.ts/.exec(fileName) != null) return;
            if (stat.isFile()) {
                if (/\.js$/.exec(fileName) != null || /\.ts/.exec(fileName)) {
                    pluginPaths.push(fileName);
                    return;
                }
            } else {
                // 如果是文件夹，则加载文件夹下与文件夹同名的文件
                let file = path.join(pluginFolder, fileName, fileName);
                if (fs.existsSync(file + "js") || fs.existsSync(file + "ts")) {
                    pluginPaths.push(path.join(fileName, fileName));
                }
            }
        });
        for (let i = 0; i < pluginPaths.length; i++) {
            const pluginPath = pluginPaths[i];
            this.logger.info(`正在导入插件 [${pluginPath}]`);
            let plugin: any | undefined = undefined;
            try {
                plugin = require(path.join(pluginFolder, pluginPath));
            } catch (error) {
                this.logger.error("导入插件时出现错误，已跳过该插件:", error);
                continue;
            }
            if (plugin != undefined) {
                if (plugin.Profile === undefined) {
                    this.logger.error("插件缺少必须的导出类: Profile, 将不会加载此插件。");
                    continue;
                }
                if (plugin.Plugin === undefined) {
                    this.logger.error("插件缺少必须的导出类: Plugin, 将不会加载此插件。");
                    continue;
                }
                if (plugin.Profile.Name === undefined || plugin.Profile.Name === "") {
                    this.logger.error("Profile 缺少必须的属性: Name, 将不会加载此插件。");
                    continue;
                }
                try {
                    let pluginProfile: PluginProfile = new plugin.PluginProfile();
                    this.logger.debug(`Name: ${pluginProfile.Name}`);
                    this.logger.debug(`PluginVersion: ${pluginProfile.PluginVersion}`);
                    this.logger.debug(`BotVersion: ${pluginProfile.BotVersion}`);
                    this.logger.debug(`Info: ${pluginProfile.Info}`);
                    this.plugins.set(pluginProfile.Name, plugin.Plugin);
                    this.logger.info("----------");
                } catch (error) {
                    this.logger.error("装载插件时出现错误，已跳过该插件\n", error);
                    continue;
                }
            }
        }
    }
}
