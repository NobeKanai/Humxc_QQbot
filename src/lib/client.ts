/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\client.ts
 * @Description:机器人的客户端，对 oicq 的封装
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import * as oicq from "oicq";
import { Config } from "./config";
import {
    BotPlugin,
    BotPluginClass,
    BotPluginProfile,
    BotPluginProfileClass,
} from "./plugin/plugin";
import { PluginManager } from "./plugin/manager";
import { getStdInput } from "./util";
export class Client {
    // oicq 客户端
    public _oicq: oicq.Client;
    // 存放的已经实例化的插件
    public plugins: Map<string, BotPlugin> = new Map<string, BotPlugin>();
    // 日志器
    private logger: oicq.Logger;
    // 配置文件
    public readonly config: Config & oicq.Config;
    constructor(uid: number, config: Config & oicq.Config) {
        this.config = config;
        this._oicq = oicq.createClient(uid, config);
        this.logger = this._oicq.logger;
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
        this._oicq.on("system.login.qrcode", async () => {
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
                plugin.init();
            } catch (error) {
                this.logger.error(`在初始化插件[${plugin.profile.Name}]时出现错误`, error);
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
        this._oicq.password_md5 = undefined;
        if (passwd === "") passwd = undefined;
        return new Promise<boolean>((resolve) => {
            this._oicq.once("system.login.error", () => {
                resolve(false);
            });
            this._oicq.once("system.online", () => {
                resolve(true);
            });
            this._oicq.login(passwd);
        });
    }
    /**
     * @description: 等待 oicq 完成登录
     */
    private waitOnline(): Promise<void> {
        return new Promise<void>((resolve) => {
            this._oicq.once("system.online", () => {
                resolve();
            });
        });
    }

    /**
     * @description: 依次给此机器人账户的所有管理员发送消息。
     * @param {(string | oicq.MessageElem)[]} message - 需要发送的消息
     */
    public async callAdmin(...message: (string | oicq.MessageElem)[]) {
        for (let i = 0; i < this.config.admin.length; i++) {
            const adm = this.config.admin[i];
            try {
                await this._oicq.sendPrivateMsg(adm, message);
            } catch (error) {
                this.logger.error(error);
            }
        }
    }
}
