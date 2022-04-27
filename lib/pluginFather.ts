/**
 * 扮演工具的角色，用来给插件提供一些功能
 */
import path from "path";
import fs from "fs";
import { BotPlugin, BotPluginConfig } from "./plugin";
import { BotClient } from "./core/client";

export class PluginFatherError {
    private static MainName = "PluginFatherError";
    /** 该错误通常不需要插件处理 */
    static ObjectNotExtendsTarget = class extends Error {
        name: string = PluginFatherError.MainName + ": " + "ObjectNotExtendsTarget";
    };
}
/** 获取外部Json文件, 需要捕获错误 */
export function getJsonData<T>(
    plugin: BotPlugin<BotPluginConfig>,
    fileName: string,
    defaultData: T
): T {
    let dataDir = getDir(plugin);
    let dataPath = path.join(dataDir, fileName + ".json");
    let data: any;
    if (fs.existsSync(dataPath)) {
        data = JSON.parse(fs.readFileSync(dataPath).toString());
    } else {
        //配置文件不存在，创建文件
        makeJson(dataDir, fileName + ".json", defaultData);
        return defaultData;
    }
    verifyExtends(data, defaultData);
    return data;
}
/** 保存Json对象到文件, 需要捕获错误 */
export function saveJsonData(plugin: BotPlugin<BotPluginConfig>, fileName: string, obj: any): void {
    let dataDir = getDir(plugin);
    try {
        makeJson(dataDir, fileName + ".json", obj);
    } catch (error) {
        throw error;
    }
}
//获取插件数据目录
export function getDir(plugin: BotPlugin<BotPluginConfig>): string {
    return path.join(
        require?.main?.path || process.cwd(),
        "data",
        plugin.client.uin.toString(),
        plugin.pluginProfile.PluginName
    );
}

function makeJson(jsonDir: string, jsonName: string, data: any): string {
    let filePath = path.join(jsonDir, jsonName);
    try {
        mkDirsSync(jsonDir);
        fs.writeFileSync(filePath, JSON.stringify(data));
        return filePath;
    } catch (error) {
        throw error;
    }
}
function mkDirsSync(fullDirName: string): boolean {
    if (fs.existsSync(fullDirName)) {
        return true;
    } else if (mkDirsSync(path.dirname(fullDirName))) {
        fs.mkdirSync(fullDirName);
    }
    return false;
}

/** 检测obj是否继承于target */
function verifyExtends(sub: any, father: any): void {
    if (typeof sub != "object") return;
    for (const key in father) {
        if (Object.prototype.hasOwnProperty.call(father, key)) {
            if (Object.prototype.hasOwnProperty.call(sub, key)) {
                let f = get(father, key);
                let s = get(sub, key);

                let fType = typeof f;
                let sType = typeof s;

                if (typeof f != "object" && typeof s != "object" && fType !== sType) {
                    throw new PluginFatherError.ObjectNotExtendsTarget(
                        `The key '${key}' want type '${fType}' but '${sType}'`
                    );
                }
                verifyExtends(s, f);
            } else
                throw new PluginFatherError.ObjectNotExtendsTarget(
                    `The key '${key}' is not exist in '${JSON.stringify(sub)}'`
                );
        }
    }
}

/** 获取对象的值 */
function get<T extends object, K extends keyof T>(o: T, name: K): T[K] {
    return o[name];
}
