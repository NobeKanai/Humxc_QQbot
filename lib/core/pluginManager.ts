/**
 * 机器人客户端加载和管理插件的地方
 */
import fs from "fs";
import { BotClient } from "./client";
import path = require("path");
import { BotPlugin, BotPluginProfile } from "../plugin";
// 存放插件的文件夹
var pluginFolder = path.join(process.cwd(), "plugin");
export class PluginManager {
    // 存放插件实体对象
    public pluginEntity: Map<string, BotPlugin> = new Map();
    private client: BotClient;
    constructor(_client: BotClient) {
        this.client = _client;
    }
    public loadPlugin() {
        this.client.logger.info("====== 准备插件 ======");
        let pluginNameList: string[] = [];
        if (!fs.existsSync(pluginFolder)) {
            fs.mkdirSync(pluginFolder);
        }
        // 如果为ALL则加载plugin下除plugin.js的全部js文件
        if (this.client.pluginList == undefined || this.client.pluginList == []) {
            this.client.logger.info("没有可以加载的插件");
            return;
        }
        if (this.client.pluginList[0] == "ALL") {
            fs.readdirSync(pluginFolder).forEach((fileName: string) => {
                if (/\.d\.ts/.exec(fileName) != null) return;
                if (/\.js$/.exec(fileName) != null || /\.ts/.exec(fileName)) {
                    pluginNameList.push(fileName);
                }
            });
        } else {
            pluginNameList = this.client.pluginList;
        }
        for (let i = 0; i < pluginNameList.length; i++) {
            const pluginName = pluginNameList[i];
            this.client.logger.info(`正在加载插件 [${pluginName}]`);
            let plugin: any = undefined;
            try {
                plugin = require(path.join(pluginFolder, pluginName));
            } catch (error) {
                this.client.logger.error("导入插件时出现错误，已跳过该插件:", error);
            }
            if (plugin != undefined) {
                try {
                    let pluginProfile: BotPluginProfile = new plugin.PluginProfile();
                    this.client.logger.debug(`Name: ${pluginProfile.PluginName}`);
                    this.client.logger.debug(`PluginVersion: ${pluginProfile.PluginVersion}`);
                    this.client.logger.debug(`BotVersion: ${pluginProfile.BotVersion}`);
                    this.client.logger.debug(`Info: ${pluginProfile.Info}`);
                    let pluginEntity: BotPlugin = new plugin.Plugin(this.client);
                    this.pluginEntity.set(pluginProfile.PluginName, pluginEntity);
                    this.client.logger.info("----------");
                } catch (error) {
                    this.client.logger.error("实例化插件时出现错误，已跳过该插件\n", error);
                }
            }
        }
    }
}
