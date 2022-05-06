/**
 * 获取设备ip
 */

import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import https from "https";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "WhatIP";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "获取设备的ip";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin<PluginConfig> {
    private apis: string[] = [
        `https://myip4.ipip.net`,
        `https://ddns.oray.com/checkip`,
        `https://ip.3322.net`,
    ];
    public init() {
        this.regKeyword("^ip$", "global", "bot_admin", async (message) => {
            for (let i = 0; i < this.apis.length; i++) {
                const url = this.apis[i];
                try {
                    let resp: string = await doGet(url);
                    let ip = /\d+\.\d+\.\d+\.\d+/.exec(resp);
                    if (ip != null) {
                        message.reply(ip[0]).catch((err) => {
                            this.logger.error(err);
                        });
                        return;
                    }
                    continue;
                } catch (error) {
                    this.logger.warn(error);
                    continue;
                }
            }
            message.reply("没有找到 ip, 请检查日志");
        });
    }
}
function doGet(url: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        let req = https.request(new URL(url), (res: any) => {
            res.setTimeout(5000, () => {
                reject(new Error("获取 IP 失败: 连接超时"));
            });
            if (res.statusCode != 200) throw new Error("获取 IP 失败: " + res.statusCode);
            res.on("data", (d: number[]) => {
                resolve(d.toString());
            });
        });
        req.on("error", (error: Error) => {
            reject(error);
        });

        req.end();
    });
}
