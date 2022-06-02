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
import { Plugin } from "./plugin/plugin";
import { getStdInput } from "./util";
export class Client {
    public _oicq: oicq.Client;
    public plugins: Map<string, Plugin> = new Map<string, Plugin>();
    private logger: oicq.Logger;
    constructor(uid: number, config: Config & oicq.Config) {
        this._oicq = oicq.createClient(uid, config);
        this.logger = this._oicq.logger;
    }
    /**
     * @description: 启动机器人
     */
    public async start(): Promise<void> {
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
    }

    /**
     * @description: 对登录过程的进一步封装
     * @param {string} passwd 密码或者密码的 md5 值
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
}
