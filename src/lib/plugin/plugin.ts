/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\plugin\plugin.ts
 * @Description: 插件类，所有插件应当继承此类。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import fs from "fs";
import * as log4js from "log4js";
import {
    DiscussMessage,
    DiscussMessageEvent,
    GroupMessage,
    GroupMessageEvent,
    LogLevel,
    PrivateMessage,
    PrivateMessageEvent,
} from "oicq";
import path from "path";
import { util } from "..";
import { Client } from "../client";
import { MsgFilter, MsgFilterPre } from "../message/filter";
import { MessageManager, MsgArea, MsgHandler, MsgTrigger } from "../message/manager";
import { Keyword } from "../message/keyword";
import { Command, CommandFunc } from "../message/command";
export interface BotPluginProfile {
    /** 插件名称 */
    Name: string;
    /** 机器人客户端版本 */
    BotVersion: string;
    /** 插件版本 */
    PluginVersion: string;
    /** 描述信息 */
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
    public keywords: Keyword[] = [];
    public commands: Command[] = [];
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

    /**
     * @description: 从磁盘的插件数据目录加载 json 文件并反序列化成 js 对象。
     * @param {string} name - 保存在磁盘上的文件名称，不需要携带扩展名
     * @param {T} defaultData - 对象的默认值，此参数不应该和类 PluginData 有重合。如果插件数据目录中不存在名为 [name].json 的文件，则会根据此参数创建一个文件。
     * @return {PluginData & T} 一个实例对象，封装了一些方法。
     */
    public getData<T>(name: string, defaultData: T): PluginData & T {
        let d = defaultData as any;
        if (
            d.dataPath !== undefined ||
            d.defaultData !== undefined ||
            d.save !== undefined ||
            d.load !== undefined
        ) {
            throw new Error("defaultData 不能包含 dataPath, defaultData, save, load 属性");
        }
        return Object.assign(new PluginData(this, name, defaultData));
    }

    /**
     * @description: 给插件添加可被触发的关键词
     * @param {MsgArea} area - 触发的范围
     * @param {MsgFilter | MsgFilterPre} filter - 过滤器，可以是预定义的过滤器，也可以自定义过滤器
     * @param {string | RegExp} keyword - 匹配的关键词
     * @param {MsgHandler} handler - 匹配成功后运行的函数
     */
    public regKeyword(
        area: MsgArea,
        filter: MsgFilter | MsgFilterPre,
        keyword: string | RegExp,
        handler: MsgHandler
    ): Keyword {
        let _keyword: Keyword = new Keyword(this, area, filter, keyword, handler);
        this.keywords.push(_keyword);
        this.client.keywordManager.reg(_keyword);
        return _keyword;
    }

    /**
     * @description: 给插件添加命令
     * @param {MsgArea} area - 触发的范围
     * @param {MsgFilter | MsgFilterPre} filter - 过滤器，可以是预定义的过滤器，也可以自定义过滤器
     * @param {string} command - 命令
     * @param {CommandFunc} func - 命令匹配成功后运行的函数
     */
    public regCommand(
        area: MsgArea,
        filter: MsgFilter | MsgFilterPre,
        command: string,
        description: string,
        func: CommandFunc
    ): Command {
        let _command: Command = new Command(this, area, filter, command, description, func);
        this.commands.push(_command);
        this.client.commandManager.reg(_command);
        return _command;
    }
}

/**
 * @description: 经过修改的日志器, 用于实现error_call_admin
 */
class PluginLogger {
    private logger: log4js.Logger;
    private client: Client;
    private pluginName: string;
    public debug(message: any, ...args: any[]) {
        this.logger.debug(message, ...args);
    }
    public error(message: any, ...args: any[]) {
        this.logger.error(message, ...args);
    }
    public fatal(message: any, ...args: any[]) {
        this.logger.fatal(message, ...args);
    }
    public info(message: any, ...args: any[]) {
        this.logger.info(message, ...args);
    }
    public mark(message: any, ...args: any[]) {
        this.logger.mark(message, ...args);
    }
    public trace(message: any, ...args: any[]) {
        this.logger.trace(message, ...args);
    }
    public warn(message: any, ...args: any[]) {
        this.logger.warn(message, ...args);
    }
    constructor(client: Client, pluginName: string) {
        this.pluginName = pluginName;
        this.client = client;
        this.logger = log4js.getLogger(
            `[${this.client.oicq.apk.display}:${this.client.oicq.uin}] [${pluginName}]`
        );
        this.logger.level = this.client.config.log_level as LogLevel;
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

class PluginData {
    /** 插件存放数据文件的目录 */
    public dataPath?: string;
    /** 数据的初始值 */
    public defaultData?: unknown;

    /**
     * @description:
     * @param {BotPlugin} plugin - 插件的实例
     * @param {string} fileName - 文件名称 (不带扩展名，扩展名被定义为 .json)
     * @param {T} defaultData - 配置的默认值，必须是能被转成 json 的对象
     */
    constructor(plugin: BotPlugin, fileName: string, defaultData: unknown) {
        this.dataPath = path.join(plugin.client.oicq.dir, plugin.profile.Name, fileName + ".json");
        this.defaultData = defaultData;
        this.load();
    }
    /**
     * @description: 从硬盘获取插件的文件，如果不存在则根据 getData 传入的对象创建一个。
     */
    public load() {
        let dataPath = this.dataPath as string;
        util.mkDirsSync(path.dirname(dataPath));
        if (fs.existsSync(dataPath)) {
            let obj = JSON.parse(fs.readFileSync(dataPath).toString());
            util.verifyExtends(obj, this.defaultData);
            Object.assign(this, obj);
            return;
        }

        // 根据 defaultConfig 创建一个新的配置文件
        util.mkJsonFile(dataPath, this.defaultData);
        Object.assign(this, this.defaultData);
    }

    /**
     * @description: 保存到 Json 文件。
     */
    public save(): void {
        let dataPath = this.dataPath as string;
        let defaultData = this.defaultData;
        delete this.dataPath;
        delete this.defaultData;
        util.mkJsonFile(dataPath, this);
        this.dataPath = dataPath;
        this.defaultData = defaultData;
    }
}
