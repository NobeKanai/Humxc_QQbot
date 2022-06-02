/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\plugin\plugin.ts
 * @Description:插件类，所有插件应当继承此类。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import * as log4js from "log4js";
import { LogLevel } from "oicq";
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
    private client: Client;
    public logger: PluginLogger;
    public profile: BotPluginProfile;
    constructor(client: Client, profile: BotPluginProfile) {
        this.client = client;
        this.profile = profile;
        this.logger = new PluginLogger(client, profile.Name);
    }
    public init() {}
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
            `[${this.client._oicq.apk.display}:${this.client._oicq.uin}] [${pluginName}]`
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
