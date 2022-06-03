/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-03
 * @FilePath: \QQbot\src\lib\plugin\plugin.ts
 * @Description:插件类，所有插件应当继承此类。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import * as log4js from "log4js";
import { LogLevel } from "oicq";
import path from "path";
import { util } from "..";
import { Client } from "../client";
export interface BotPluginProfile {
    // 插件名称
    Name: string;
    // 机器人客户端版本
    BotVersion: string;
    // 插件版本
    PluginVersion: string;
    // 描述信息
    Info: string;
}
export type BotPluginClass = { new (client: Client, profile: BotPluginProfile): BotPlugin };
export type BotPluginProfileClass = { new (): BotPluginProfile };
/**
 * @description: 插件的实现类，所有插件都应该继承自此类
 */
export class BotPlugin {
    // 机器人客户端
    public client: Client;
    public logger: PluginLogger;
    public profile: BotPluginProfile;

    constructor(client: Client, profile: BotPluginProfile) {
        this.client = client;
        this.profile = profile;
        this.logger = new PluginLogger(client, profile.Name);
    }

    /**
     * @description: 初始化插件，此方法会在客户端成功登录之后被调用。插件应该重写此方法。
     */
    public init() {
        throw new Error(this.profile.Name + "没有重写 init() 方法");
    }
}

/**
 * @description: 经过修改的日志器, 用于实现error_call_admin
 */
class PluginLogger {
    private logger: log4js.Logger;
    private client: Client;
    private pluginName: string;
    public debug: (message: any, ...args: any[]) => void;
    public error: (message: any, ...args: any[]) => void;
    public fatal: (message: any, ...args: any[]) => void;
    public info: (message: any, ...args: any[]) => void;
    public mark: (message: any, ...args: any[]) => void;
    public trace: (message: any, ...args: any[]) => void;
    public warn: (message: any, ...args: any[]) => void;
    constructor(client: Client, pluginName: string) {
        this.pluginName = pluginName;
        this.client = client;
        this.logger = log4js.getLogger(
            `[${this.client.oicq.apk.display}:${this.client.oicq.uin}] [${pluginName}]`
        );
        this.logger.level = this.client.config.log_level as LogLevel;

        this.debug = this.logger.debug;
        this.error = this.logger.error;
        this.fatal = this.logger.fatal;
        this.info = this.logger.info;
        this.mark = this.logger.mark;
        this.trace = this.logger.trace;
        this.warn = this.logger.warn;
        if (this.client.config.error_call_admin == true) {
            this.error = (message: any, ...args: any[]) => {
                // this.logger.error("测试错误", "啊对对对", new Error("error"));
                this.logger.error(message, ...args);
                let msgs: string[] = [];
                if (message.message !== undefined) {
                    msgs.push("\n" + message.message);
                } else if (message.toString !== undefined) {
                    msgs.push("\n" + message.toString());
                }
                for (let i = 0; i < args.length; i++) {
                    if (args[i].message !== undefined) {
                        msgs.push("\n" + args[i].message);
                        continue;
                    }
                    if (args[i].toString !== undefined) {
                        msgs.push("\n" + args[i].toString());
                        continue;
                    }
                }
                this.client.callAdmin(`有插件出现错误\n${this.pluginName}`, ...msgs);
            };
        }
    }
}

export class PluginData<T> {
    // 插件存放数据文件的目录
    public readonly dataPath: string;
    public data: T;
    // 数据的初始值
    private defaultData: T | undefined = undefined;
    /**
     * @description:
     * @param {BotPlugin} plugin - 插件的实例
     * @param {string} fileName - 文件名称 (不带扩展名，扩展名被定义为 .json)
     * @param {T} defaultData - 配置的默认值，必须是能被转成 json 的对象
     */
    constructor(plugin: BotPlugin, fileName: string, defaultData: T) {
        this.dataPath = path.join(plugin.client.oicq.dir, plugin.profile.Name, fileName + ".json");
        this.defaultData = defaultData;
        this.data = this.getConfig() as T;
    }
    /**
     * @description: 从硬盘获取插件的配置，如果不存在则创建一个。
     */
    private getConfig(): unknown {
        util.mkDirsSync(path.dirname(this.dataPath));
        if (fs.existsSync(this.dataPath)) {
            let obj = JSON.parse(fs.readFileSync(this.dataPath).toString());
            util.verifyExtends(obj, this.defaultData);
        }

        // 根据 defaultConfig 创建一个新的配置文件
        util.mkJsonFile(this.dataPath, this.defaultData);
        return this.defaultData;
    }

    /**
     * @description: 保存配置文件。
     */
    public saveConfig(): void {}
}
