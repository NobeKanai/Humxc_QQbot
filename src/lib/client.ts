/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\client.ts
 * @Description:机器人的客户端，对 oicq 的封装
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import * as _oicq from "oicq";
import { Config } from "./config";
import {
    BotPlugin,
    BotPluginClass,
    BotPluginProfile,
    BotPluginProfileClass,
} from "./plugin/plugin";
import { PluginManager } from "./plugin/manager";
import { getStdInput, sleep } from "./util";
import EventEmitter from "events";
import { MessageManager } from "./message/manager";
import { EventMap } from "./events";
import { KeywordManager } from "./message/keyword";
import { CommandManager } from "./message/command";

/** 事件接口 */
export interface Client {
    on<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    on<S extends string | symbol>(
        event: S & Exclude<S, keyof EventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
    once<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    once<S extends string | symbol>(
        event: S & Exclude<S, keyof EventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
    prependListener<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    prependListener(event: string | symbol, listener: (this: this, ...args: any[]) => void): this;
    prependOnceListener<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    prependOnceListener(
        event: string | symbol,
        listener: (this: this, ...args: any[]) => void
    ): this;
}
export class Client extends EventEmitter {
    // oicq 客户端
    public oicq: _oicq.Client;
    // 存放的已经实例化的插件
    public plugins: Map<string, BotPlugin> = new Map<string, BotPlugin>();
    // 日志器
    private logger: _oicq.Logger;
    // 管理员列表
    public readonly admins: Set<number> = new Set<number>();
    // 配置文件
    public readonly config: Config & _oicq.Config;
    // 消息处理器
    private msgManager: MessageManager;
    // 关键词管理器
    public keywordManager: KeywordManager;
    // 命令管理器
    public commandManager: CommandManager;
    constructor(uid: number, config: Config & _oicq.Config) {
        super();
        this.config = config;
        this.oicq = _oicq.createClient(uid, config);
        this.logger = this.oicq.logger;
        this.msgManager = new MessageManager(this);
        this.keywordManager = new KeywordManager(this, this.msgManager);
        this.commandManager = new CommandManager(this, this.msgManager);
        //一天更替事件
        let nowDate = new Date();
        let timeout =
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 2 + nowDate.getDate()).getTime() -
            nowDate.getTime();
        setTimeout(() => {
            this.emit("newday");
            setInterval(() => {
                this.emit("newday");
            }, 86400000);
        }, timeout);
    }
    /**
     * @description: 启动机器人
     */
    public async start(): Promise<void> {
        // 获取插件的配置和类
        let _plugins: [BotPluginProfileClass, BotPluginClass][] = [];
        if (this.config.plugins[0] !== undefined && this.config.plugins[0] === "ALL") {
            _plugins = PluginManager.getAllPlugins();
        } else {
            _plugins = PluginManager.getPlugins(...this.config.plugins);
        }

        // 实例化插件
        for (let i = 0; i < _plugins.length; i++) {
            const p = _plugins[i];
            try {
                let profile = new p[0]();
                let plugin = new p[1](this, profile);
                this.plugins.set(profile.Name, plugin);
            } catch (error) {
                this.logger.error("在实例化插件时出现错误", error);
            }
        }

        // 二维码登录
        this.oicq.on("system.login.qrcode", async () => {
            this.logger.info("输入密码开启密码登录，或者扫码之后按下回车登录。");
            let input = await getStdInput();
            if (input === "") {
                this.login();
            } else {
                if (!(await this.login(input))) {
                    this.login();
                }
            }
        });
        this.login();
        await this.waitOnline();

        // 初始化插件
        for (const plugin of this.plugins.values()) {
            try {
                this.logger.mark(`正在初始化插件 [${plugin.profile.Name}]`);
                plugin.init.call(plugin);
            } catch (error) {
                this.logger.error(`在初始化插件 [${plugin.profile.Name}]时出现错误`, error);
            }
        }
    }

    /**
     * @description: 对登录过程的进一步封装
     * @param {string} passwd - 密码或者密码的 md5 值
     * @return {boolean} 返回值表示登录是否成功
     */
    private login(passwd: string | undefined = undefined): Promise<boolean> {
        // 重置保存的 密码md5 值，如果不这样做，oicq 可能会使用旧密码登录。
        this.oicq.password_md5 = undefined;
        if (passwd === "") passwd = undefined;
        return new Promise<boolean>((resolve) => {
            this.oicq.once("system.login.error", () => {
                resolve(false);
            });
            this.oicq.once("system.online", () => {
                resolve(true);
            });
            this.oicq.login(passwd);
        });
    }

    /**
     * @description: 等待 oicq 完成登录
     */
    private waitOnline(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.oicq.once("system.online", () => {
                resolve();
            });
        });
    }

    /**
     * @description: 依次给此机器人账户的所有管理员发送消息。
     * @param {(string | oicq.MessageElem)[]} message - 需要发送的消息
     */
    public async callAdmin(...message: (string | _oicq.MessageElem)[]) {
        for (const admin of this.admins.values()) {
            try {
                await this.oicq.sendPrivateMsg(admin, message);
                // 发送过快可能会被检测为异常而冻结
                await sleep(500);
            } catch (error) {
                this.logger.error(error);
            }
        }
    }

    /**
     * @description: 判断 qq 号是否为此机器人的管理员。
     * @param {number} uid - 需要判断的 qq 号
     * @return {boolean} 如果传入的 qq 号在管理员列表内则返回 true
     */
    public isAdmin(uid: number): boolean {
        return this.admins.has(uid);
    }

    /**
     * @description: 判断 qq 号是否为此机器人的好友。
     * @param {number} uid - 需要判断的 qq 号
     * @return {boolean} 如果传入的 qq 号在好友列表内则返回 true
     */
    public isFriend(uid: number): boolean {
        return this.oicq.fl.has(uid);
    }
    /** emit an event */
    em<K extends keyof EventMap>(name: K, data?: any) {
        let _name: string = name;
        while (true) {
            this.emit(_name, data);
            let i = name.lastIndexOf(".");
            if (i === -1) break;
            _name = name.slice(0, i);
        }
    }
}
