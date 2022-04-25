/**
 * 扮演工具的角色，用来给插件提供一些功能
 */
import path from "path";
import fs from "fs";
import { BotPlugin } from "./plugin";

/** 该错误通常不需要插件处理 */
const ObjectNotExtendsTarget = (message: string): Error => {
    return new Error("Object is not extends target: " + message);
};
/** 获取配置对象 */
export function getConfig<T>(plugin: BotPlugin, defaultConfig: T): T {
    return getJsonData<T>(plugin, "config", defaultConfig);
}
/** 保存配置对象到文件 */
export function saveConfig(plugin: BotPlugin): void {
    return saveJsonData(plugin, "config", plugin.config);
}
/** 获取外部Json文件 */
export function getJsonData<T>(plugin: BotPlugin, fileName: string, defaultData: T): T {
    let dataDir = getDir(plugin);
    let dataPath = path.join(dataDir, fileName + ".json");
    let data: any;
    if (fs.existsSync(dataPath)) {
        try {
            data = JSON.parse(fs.readFileSync(dataPath).toString());
        } catch (error) {
            throw error;
        }
    } else {
        //配置文件不存在，创建文件
        try {
            makeJson(dataDir, fileName + ".json", defaultData);
        } catch (error) {
            plugin.bot.logger.error(error);
        }
        return defaultData;
    }
    verifyExtends(data, defaultData);
    return data;
}
//保存数据对象到文件
export function saveJsonData(plugin: BotPlugin, fileName: string, obj: any) {
    let dataDir = getDir(plugin);
    try {
        makeJson(dataDir, fileName + ".json", obj);
    } catch (error) {
        plugin.bot.logger.error(error);
    }
}
//获取插件数据目录
export function getDir(plugin: BotPlugin): string {
    return path.join(
        require?.main?.path || process.cwd(),
        "data",
        plugin.bot.uin.toString(),
        plugin.pluginProfile.PluginName
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

/** 检测obj是否继承于target */
function verifyExtends(sub: any, father: any): void {
    if (typeof sub != "object") return;
    for (const key in father) {
        if (Object.prototype.hasOwnProperty.call(father, key)) {
            if (Object.prototype.hasOwnProperty.call(sub, key)) {
                let fa = get(father, key);
                let su = get(sub, key);
                if (fa !== su) {
                    throw ObjectNotExtendsTarget(`Want: ${key}=${fa} but ${key}=${su}`);
                }
                verifyExtends(su, fa);
            } else throw ObjectNotExtendsTarget(`The key '${key}' is not exist in '${sub}'`);
        }
    }
}

/** 获取对象的值 */
function get<T extends object, K extends keyof T>(o: T, name: K): T[K] {
    return o[name];
}
