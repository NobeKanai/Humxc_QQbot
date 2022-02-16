import { BotClient } from "./core/client";
import path from "path";
import { json } from "stream/consumers";
const fs = require("fs");
export function getConig(
  bot: BotClient,
  pluginName: string,
  defaultConfig: any = "{}"
) {
  let config = defaultConfig;
  if (pluginName == undefined || pluginName == "") {
    throw new Error("创建配置文件失败 - 没有插件名称");
  }
  let configPath = path.join(
    require?.main?.path || process.cwd(),
    "data",
    bot.uin + "",
    pluginName,
    "config.json"
  );

  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath).toString());
    } else {
      function mkdirsSync(dirName: string) {
        if (fs.existsSync(dirName)) {
          return true;
        } else {
          if (mkdirsSync(path.dirname(dirName))) {
            fs.mkdirSync(dirName);
            return true;
          }
        }
      }
      mkdirsSync(path.dirname(configPath));
      saveConfig(bot, pluginName, config);
    }
  } catch (err) {
    bot.errorCallAdmin(err);
  }
  return config;
}
export function saveConfig(bot: BotClient, pluginName: string, config: any) {
  let configPath = path.join(
    require?.main?.path || process.cwd(),
    "data",
    bot.uin + "",
    pluginName,
    "config.json"
  );
  try {
    fs.writeFileSync(configPath, JSON.stringify(config));
  } catch (error) {
    bot.errorCallAdmin(error);
  }
}
export function getConfigDir(bot: BotClient, pluginName: string) {
  return path.join(
    require?.main?.path || process.cwd(),
    "data",
    bot.uin + "",
    pluginName,
    "config.json"
  );
}
export function getData(
  bot: BotClient,
  pluginName: string,
  defaultData: any = "{}"
) {
  let data = defaultData;
  if (pluginName == undefined || pluginName == "") {
    throw new Error("创建数据文件失败 - 没有插件名称");
  }
  let dataPath = path.join(
    require?.main?.path || process.cwd(),
    "data",
    bot.uin + "",
    pluginName,
    "data.json"
  );

  try {
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath).toString());
    } else {
      function mkdirsSync(dirName: string) {
        if (fs.existsSync(dirName)) {
          return true;
        } else {
          if (mkdirsSync(path.dirname(dirName))) {
            fs.mkdirSync(dirName);
            return true;
          }
        }
      }
      mkdirsSync(path.dirname(dataPath));
      saveData(bot, pluginName, data);
    }
  } catch (err) {
    bot.errorCallAdmin(err);
  }
  return data;
}
export function saveData(bot: BotClient, pluginName: string, data: any) {
  let dataPath = path.join(
    require?.main?.path || process.cwd(),
    "data",
    bot.uin + "",
    pluginName,
    "data.json"
  );
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data));
    bot.logger.info(`已保存数据 - ${dataPath}}`);
  } catch (error) {
    bot.errorCallAdmin(error);
  }
}
