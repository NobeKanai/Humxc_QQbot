import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import { Rcon, RconOptions } from "rcon-client";
import url from "url";
class RconClient extends Rcon {
    private autoClose: NodeJS.Timeout;
    private commandList: string[] = [];
    private isSending: boolean = false;
    constructor(option: RconOptions) {
        super(option);
        this.on("error", (err) => {
            console.log(err);
        });
        this.autoClose = setTimeout(() => {
            if (this.authenticated) {
                try {
                    this.end();
                } catch (error) {}
            }
        }, 120000);
        // @ts-ignore
        this.on("run", async () => {
            if (this.isSending) return;

            let cmd = this.commandList.shift();
            while (cmd != undefined) {
                if (!this.authenticated) {
                    try {
                        await this.connect();
                    } catch (error) {
                        return (error as Error).message;
                    }
                }
                try {
                    let msg = await this.send(cmd);
                    // @ts-ignore
                    this.emitter.emit("hasResult", msg);
                } catch (error) {
                    // @ts-ignore
                    this.emitter.emit("hasResult", error);
                }

                await sleep(2000);
                cmd = this.commandList.shift();
            }
        });
    }

    public async sendCommand(command: string): Promise<string> {
        this.autoClose.refresh();

        this.commandList.push(command);
        return await new Promise<string>((resolve) => {
            // @ts-ignore
            this.emitter.emit("run");
            // @ts-ignore
            this.once("hasResult", (msg) => {
                resolve(msg);
            });
        });
    }
}

interface User extends BotPluginUser {
    host: string;
    port: number;
    password: string;
}
export class PluginConfig implements BotPluginConfig {
    Users: User[] = [
        {
            host: "Server`s Host",
            port: 25575,
            password: "Rcon password",
            type: "Group",
            uid: 0,
        },
    ];
}
export class PluginProfile implements BotPluginProfile {
    PluginName = "MinecraftHelper";
    BotVersion = "0.0.1";
    PluginVersion = "1.0.0";
    Info = "使用Rcon与MC服务器进行交互";
}
export class Plugin extends BotPlugin<PluginConfig> {
    private rcons: Map<string, RconClient> = new Map();
    constructor(botClient: BotClient, pluginProfile: PluginProfile, pluginConfig: PluginConfig) {
        super(botClient, pluginProfile, pluginConfig);

        for (let i = 0; i < this.config.Users.length; i++) {
            const user = this.config.Users[i];
            let url: string = `${user.host}:${user.port}`;
            let rconOption: RconOptions = {
                host: user.host,
                password: user.password,
                port: user.port,
            };
            this.rcons.set(url, new RconClient(rconOption));
        }

        this.regKeyword("^查服", "global", "plugin_user", async (message) => {
            let user!: User;
            switch (message.message_type) {
                case "group":
                    user = this.getUser(message.group_id, "Group");
                    break;

                case "private":
                    user = this.getUser(message.sender.user_id, "Person");
                    break;
                default:
                    return;
            }
            let msg = await this.send(user, "list");
            if (msg === "") return;
            msg = parseList(msg);
            message.reply(msg).catch((err) => {
                this.logger.error(err);
            });
        });
        this.regKeyword("mc", "global", "plugin_user", async (message) => {
            let user!: User;
            let sendstr = "";
            switch (message.message_type) {
                case "group":
                    user = this.getUser(message.group_id, "Group");
                    sendstr = `say §b<${message.sender.card}>§f ${message.raw_message.substr(
                        3,
                        message.raw_message.length + 1
                    )}`;
                    break;

                case "private":
                    user = this.getUser(message.sender.user_id, "Person");
                    sendstr = `say §b<${message.sender.nickname}>§f ${message.raw_message.substr(
                        3,
                        message.raw_message.length + 1
                    )}`;
                    break;
                default:
                    return;
            }
            let msg = await this.send(user, sendstr);
            if (msg === "") return;
            message.reply(msg).catch((err) => {
                this.logger.error(err);
            });
        });
    }

    send(user: User, command: string): Promise<string> {
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve("失败, 发送超时");
            }, 5000);
            let url = user.host + ":" + user.port;
            let rcon = this.rcons.get(url);
            if (rcon == null) {
                resolve("未加载rcon客户端");
            } else {
                rcon.sendCommand(command).then((msg) => {
                    resolve(msg);
                });
            }
        });
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
async function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => resolve(), time);
    });
}
