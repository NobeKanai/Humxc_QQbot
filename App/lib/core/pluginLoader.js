"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlugin = exports.loadPlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path = require("path");
var pluginPath = path.join(process.cwd(), "plugin");
function loadPlugin(client) {
    let Plugins = {
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
        let isJsFile = (fileName) => {
            return fs_1.default.lstatSync(fileName).isFile() && path.extname(fileName) == ".js";
        };
        let list = fs_1.default
            .readdirSync(pluginPath)
            .map((fileName) => {
            return path.join(pluginPath, fileName);
        })
            .filter(isJsFile);
        loadJsFile(list);
    }
    else {
        //加载指定列表的文件
        let list = [];
        client.pluginList.forEach((fileName) => {
            list.push(path.join(pluginPath, fileName));
        });
        loadJsFile(list);
    }
    function loadJsFile(list) {
        for (let i = 0; i < list.length; i++) {
            const file = list[i];
            client.logger.info("正在加载插件[" + path.basename(file) + "]");
            let p;
            try {
                p = require(file);
            }
            catch (error) {
                client.logger.warn("加载[" + path.basename(file) + "]时出错，已跳过该插件");
                client.errorCallAdmin(error);
                continue;
            }
            if (!(p.PluginConfig == undefined ||
                p.Plugin == undefined ||
                p.PluginConfig.PluginName == undefined ||
                p.PluginConfig.PluginName == "")) {
                client.logger.debug(`----------`);
                for (const key in p.PluginConfig) {
                    if (Object.prototype.hasOwnProperty.call(p.PluginConfig, key)) {
                        client.logger.debug(`${key}: ${p.PluginConfig[key]}`);
                    }
                }
            }
            else {
                client.logger.warn(`插件缺少关键配置，已取消加载`);
                continue;
            }
            //根据SessionAeea分类
            switch (p.PluginConfig.SessionArea) {
                case "GLOBAL":
                    Plugins.global[p.PluginConfig.PluginName] = p.Plugin;
                    break;
                case "GROUP":
                    Plugins.group[p.PluginConfig.PluginName] = p.Plugin;
                    break;
                case "PRIVATE":
                    Plugins.private[p.PluginConfig.PluginName] = p.Plugin;
                    break;
                default:
                    client.logger.warn(`插件没有设置或者设置了不支持的SessionArea`);
                    continue;
            }
            //描述插件位置的路径
            let plugin_path = `${p.PluginConfig.SessionArea.toLowerCase()}.${p.PluginConfig.PluginName}`;
            //注册事件
            if (!(p.PluginConfig.Event == undefined || p.PluginConfig.Event == "")) {
                let events = p.PluginConfig.Event;
                for (let i = 0; i < events.length; i++) {
                    client.registeEvent(events[i], plugin_path);
                    client.logger.debug(`${p.PluginConfig.PluginName}已监听事件:${events[i]}`);
                }
            }
            //注册关键词
            if (!(p.PluginConfig.Keyword == undefined || p.PluginConfig.Keyword == "")) {
                let keywords = p.PluginConfig.Keyword;
                for (let i = 0; i < keywords.length; i++) {
                    client.keywords.set(keywords[i], plugin_path);
                }
            }
        }
        client.logger.debug(`----------`);
    }
    client.logger.info("插件加载完毕!");
    return Plugins;
}
exports.loadPlugin = loadPlugin;
function parsePlugin() { }
exports.parsePlugin = parsePlugin;
