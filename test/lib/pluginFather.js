"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveData = exports.getData = exports.getConfigDir = exports.saveConfig = exports.getConig = void 0;
const path_1 = __importDefault(require("path"));
const fs = require("fs");
function getConig(bot, pluginName, defaultConfig = "{}") {
    let config = defaultConfig;
    if (pluginName == undefined || pluginName == "") {
        throw new Error("创建配置文件失败 - 没有插件名称");
    }
    let configPath = path_1.default.join(require?.main?.path || process.cwd(), "data", bot.uin + "", pluginName, "config.json");
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath).toString());
        }
        else {
            function mkdirsSync(dirName) {
                if (fs.existsSync(dirName)) {
                    return true;
                }
                else {
                    if (mkdirsSync(path_1.default.dirname(dirName))) {
                        fs.mkdirSync(dirName);
                        return true;
                    }
                }
            }
            mkdirsSync(path_1.default.dirname(configPath));
            saveConfig(bot, pluginName, config);
        }
    }
    catch (err) {
        bot.errorCallAdmin(err);
    }
    return config;
}
exports.getConig = getConig;
function saveConfig(bot, pluginName, config) {
    let configPath = path_1.default.join(require?.main?.path || process.cwd(), "data", bot.uin + "", pluginName, "config.json");
    try {
        fs.writeFileSync(configPath, JSON.stringify(config));
    }
    catch (error) {
        bot.errorCallAdmin(error);
    }
}
exports.saveConfig = saveConfig;
function getConfigDir(bot, pluginName) {
    return path_1.default.join(require?.main?.path || process.cwd(), "data", bot.uin + "", pluginName, "config.json");
}
exports.getConfigDir = getConfigDir;
function getData(bot, pluginName, defaultData = "{}") {
    let data = defaultData;
    if (pluginName == undefined || pluginName == "") {
        throw new Error("创建数据文件失败 - 没有插件名称");
    }
    let dataPath = path_1.default.join(require?.main?.path || process.cwd(), "data", bot.uin + "", pluginName, "data.json");
    try {
        if (fs.existsSync(dataPath)) {
            data = JSON.parse(fs.readFileSync(dataPath).toString());
        }
        else {
            function mkdirsSync(dirName) {
                if (fs.existsSync(dirName)) {
                    return true;
                }
                else {
                    if (mkdirsSync(path_1.default.dirname(dirName))) {
                        fs.mkdirSync(dirName);
                        return true;
                    }
                }
            }
            mkdirsSync(path_1.default.dirname(dataPath));
            saveData(bot, pluginName, data);
        }
    }
    catch (err) {
        bot.errorCallAdmin(err);
    }
    return data;
}
exports.getData = getData;
function saveData(bot, pluginName, data) {
    let dataPath = path_1.default.join(require?.main?.path || process.cwd(), "data", bot.uin + "", pluginName, "data.json");
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data));
        bot.logger.info(`已保存数据 - ${dataPath}}`);
    }
    catch (error) {
        bot.errorCallAdmin(error);
    }
}
exports.saveData = saveData;
