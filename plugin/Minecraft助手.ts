import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig, LoadArea } from "../lib/plugin";
import { Rcon, RconOptions } from "rcon-client";
import http, { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { getConfig } from "../lib/pluginFather";
var defaultConfig = {
    name: "填一个名称",
    ip: "服务器的ip",
    port: "Rcon的端口",
    password: "Rcon的密码",
    group: ["绑定的群组（数组）"],
};
export class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    Event?: string[] | undefined;
    PluginName = "Minecraft助手";
    BotVersion = "0.0.1";
    PluginVersion = "1.0.0";
    Info = "使用Rcon与MC服务器进行交互";
    Keyword = ["^查服", "^mc "];
}
export class Plugin extends BotPlugin {
    private rconOption!: RconOptions;
    private rcon!: Rcon;
    private rconAutoClose: NodeJS.Timeout | undefined;
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, defaultConfig);
        this.rconOption = {
            host: this.config.host,
            password: this.config.password,
        };
        this.rcon = new Rcon(this.rconOption);
        this.startserver();
    }
    startserver() {
        var token = "kxnd9injHJKfe55wcds";
        http.createServer((request: IncomingMessage, response: ServerResponse) => {
            response.writeHead(200, { "Content-Type": "text/plain" });
            if (request.url != undefined) {
                var urlObj: url.UrlWithParsedQuery = url.parse(request.url, true);
                var query = urlObj.query;
                if (query.token == token) {
                    response.end("Ok");
                    if (query.msg != undefined && query.msg != "")
                        this.bot
                            .sendGroupMsg(this.config.group[0], query.msg)
                            .catch((e) => console.log(e));
                    else this.logger.warn("服务器发来的消息为空: " + request.url);
                }
            } else this.logger.error("request.url == undefined");
        });
    }
    async keyword(keyword: string, data: any) {
        if (new Set(this.config.group).has(data.group_id)) {
            if (this.rconAutoClose == undefined)
                this.rconAutoClose = setTimeout(() => {
                    this.rcon.end();
                }, 120000);
            else {
                clearTimeout(this.rconAutoClose);
                this.rconAutoClose = undefined;
            }
            try {
                await this.rcon.connect();
            } catch (error) {}

            switch (keyword) {
                case "^查服":
                    try {
                        let msg;
                        msg = await this.rcon.send("list").catch((err) => {
                            msg = err.message;
                        });
                        if (msg != undefined) await data.reply(parseList(msg));
                    } catch (error) {
                        data.reply(error).catch((e: any) => this.logger.error(e));
                    }
                    break;

                case "^mc ": {
                    let msg = `§b<${data.sender.card}>§f ${data.raw_message.substr(
                        3,
                        data.raw_message.length + 1
                    )}`;
                    try {
                        await this.rcon.send("say " + msg);
                    } catch (error) {
                        data.reply(error).catch((e: any) => this.logger.error(e));
                    }
                }
            }
        }
    }
}

function 空服回复() {
    let 回复 = [
        "没人在线(；′⌒`)",
        "大伙都不敢玩，说是有人在服务器里下毒",
        "怎么都不玩啊，这服务器十分的珍贵",
        "tnnd!玩啊!为什么不玩",
        "你这服务器多少钱一斤啊，怎么没人玩",
    ];
    let a = parseInt((Math.random() * 回复.length).toString(), 10);
    return 回复[a];
}
function parseList(str: string | undefined) {
    if (str == undefined || str == "") return "空的回复";
    let retstr = "有";
    let playerNumber: string = "0";
    try {
        let reg = /There are (\d+) of/g.exec(str);
        if (reg != null) playerNumber = reg[1];
        else retstr = "出现异常: playerNumber==null";
    } catch (err) {
        console.log(err);
        retstr = "回复错误？请重试";
        return retstr;
    }
    if (playerNumber == "0") {
        retstr = 空服回复();
    } else {
        retstr += playerNumber + "名玩家在线\n- ";
        let reg = /online: (.+)/g.exec(str);
        if (reg != null) retstr += reg[1].replace(/, /g, "\n- ");
        else retstr = 空服回复();
    }
    return retstr;
}
function sleep(time: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
