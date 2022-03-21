import fs from "fs";
import path = require("path");
import { BotClient } from "./client";
import { BotPlugin, BotPluginConfig } from "../plugin";
var pluginPath = path.join(process.cwd(), "plugin");
export function loadPlugin(client: BotClient): any {
    let Plugins: any = {
        global: {},
        group: {},
        private: {},
    };
    //如果为ALL则加载plugin下除plugin.js的全部js文件
    if (client.pluginList == undefined || client.pluginList == []) {
        client.logger.info("没有可以加载的插件");
        return;
    }
    if (client.pluginList[0] == "ALL") {
        //查找目录下的js文件
        let isJsFile = (fileName: string) => {
            return (
                fs.lstatSync(fileName).isFile() &&
                (path.extname(fileName) == ".js" || path.extname(fileName) == ".ts")
            );
        };
        let list = fs
            .readdirSync(pluginPath)
            .map((fileName: string) => {
                return path.join(pluginPath, fileName);
            })
            .filter(isJsFile);
        loadJsFile(list).forEach((plugin) => parsePlugin(plugin));
    } else {
        //加载指定列表的文件
        let list: Array<string> = [];
        client.pluginList.forEach((fileName) => {
            list.push(path.join(pluginPath, fileName));
        });
        loadJsFile(list).forEach((plugin) => parsePlugin(plugin));
    }

    function loadJsFile(list: Array<string>): Array<any> {
        let plugins: Array<any> = [];
        for (let i = 0; i < list.length; i++) {
            const file = list[i];

            client.logger.info("正在导入插件[" + path.basename(file) + "]");
            let p: any;
            try {
                p = require(file);
                plugins.push(p);
            } catch (error) {
                client.logger.error("导入[" + path.basename(file) + "]时出错，已跳过该插件");
                client.logger.error(error);
                continue;
            }
        }
        return plugins;
    }
    client.logger.info(`----------`);
    client.logger.info("插件加载完毕!");
    return Plugins;
    //解析插件
    function parsePlugin(plugin: any) {
        let p: BotPlugin = plugin.Plugin;
        let c: BotPluginConfig = new plugin.PluginConfig();
        client.logger.debug(`----------`);
        client.logger.debug(`PluginName: ${c.PluginName}`);
        client.logger.debug(`PluginVersion: ${c.PluginVersion}`);
        client.logger.debug(`BotVersion: ${c.BotVersion}`);
        client.logger.debug(`LoadArea: ${c.LoadArea}`);
        client.logger.debug(`Event: ${c.Event}`);
        client.logger.debug(`Keyword: ${c.Keyword}`);
        client.logger.debug(`Info: ${c.Info}`);
        //根据LoadAeea分类
        switch (c.LoadArea) {
            case "GLOBAL":
                Plugins.global[c.PluginName] = p;

                break;
            case "GROUP":
                Plugins.group[c.PluginName] = p;

                break;
            case "PRIVATE":
                Plugins.private[c.PluginName] = p;

                break;
            default:
                client.logger.error(`插件没有设置或者设置了不支持的LoadArea`);
                return;
        }
        //描述插件位置的路径
        let plugin_path: string = `${c.LoadArea.toLowerCase()}.${c.PluginName}`;
        //注册事件
        if (!(c.Event == undefined || c.Event == [])) {
            let events: Array<string> = c.Event;
            for (let i = 0; i < events.length; i++) {
                client.registeEvent(events[i], plugin_path);
                client.logger.debug(`${c.PluginName}已监听事件:${events[i]}`);
            }
        }
        //注册关键词
        if (!(c.Keyword == undefined || c.Keyword == [])) {
            let keywords: Array<string> = c.Keyword;
            for (let i = 0; i < keywords.length; i++) {
                client.keywords.set(keywords[i], plugin_path);
            }
        }
    }
}
