import path from "path";
import fs from "fs";
import { BotPlugin } from "./plugin";
import { BotConfig } from "./core/client";
//获取配置对象
export function getConfig(plugin: BotPlugin, defaultConfig: any) {
  let configDir = path.join(
    require?.main?.path || process.cwd(),
    "data",
    plugin.bot.uin.toString(),
    plugin.pluginConfig.PluginName
  );
  let configPath = path.join(configDir, "config.json");
  if (fs.existsSync(configPath)) {
    return readJson(configPath);
  } else {
    //配置文件不存在，创建文件
    try {
      makeJson(configDir, "config.json", defaultConfig);
    } catch (error) {
      plugin.bot.logger.error(error);
    }

    return defaultConfig;
  }
}
//保存配置对象到文件
export function saveConfig(plugin: BotPlugin) {
  let configDir = path.join(
    require?.main?.path || process.cwd(),
    "data",
    plugin.bot.uin.toString(),
    plugin.pluginConfig.PluginName
  );
  try {
    makeJson(configDir, "config.json", plugin.config);
  } catch (error) {
    plugin.bot.logger.error(error);
  }
}
//获取数据对象
export function getData(plugin: BotPlugin, defaultData: any) {
  let dataDir = path.join(
    require?.main?.path || process.cwd(),
    "data",
    plugin.bot.uin.toString(),
    plugin.pluginConfig.PluginName
  );
  let dataPath = path.join(dataDir, "data.json");
  if (fs.existsSync(dataPath)) {
    return readJson(dataPath);
  } else {
    //配置文件不存在，创建文件
    try {
      makeJson(dataDir, "data.json", defaultData);
    } catch (error) {
      plugin.bot.logger.error(error);
    }

    return defaultData;
  }
}
//保存数据对象到文件
export function saveData(plugin: BotPlugin) {
  let dataDir = path.join(
    require?.main?.path || process.cwd(),
    "data",
    plugin.bot.uin.toString(),
    plugin.pluginConfig.PluginName
  );
  try {
    makeJson(dataDir, "data.json", plugin.data);
  } catch (error) {
    plugin.bot.logger.error(error);
  }
}
//获取插件数据目录
export function getDir(plugin: BotPlugin) {
  return path.join(
    require?.main?.path || process.cwd(),
    "data",
    plugin.bot.uin.toString(),
    plugin.pluginConfig.PluginName
  );
}

function makeJson(jsonDir: string, jsonName: string, data: any) {
  let filePath = path.join(jsonDir, jsonName);
  try {
    if (!fs.existsSync(jsonDir)) {
      mkDirsSync(jsonDir);
    }
    fs.writeFileSync(filePath, JSON.stringify(data));
    return filePath;
  } catch (error) {
    throw error;
  }
}
function mkDirsSync(dirName: string) {
  if (fs.existsSync(dirName)) {
    return true;
  } else {
    if (mkDirsSync(path.dirname(dirName))) {
      fs.mkdirSync(dirName);
      return true;
    }
  }
}
function readJson(jsonPath: string) {
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath).toString());
  }
  return {};
}
