import {
    createClient,
    Client,
    MessageEvent,
    Config,
    Sendable,
    Quotable,
    MessageRet,
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
} from "oicq";
import { loadPlugin } from "./pluginLoader";
import { Session } from "./session";
import log4js from "log4js";
export interface BotConfig extends Config {
    //机器人的QQ密码
    password: string;
    //管理员列表
    admin: Array<number> | undefined;
    //插件列表
    plugin_list: Array<string> | undefined;
    //是否将错误消息发送给管理员
    error_call_admin: boolean | undefined;
    //是否保存日志到文件
    save_log_file: boolean | undefined;
}

export class BotClient extends Client {
    /** 账户密码 */
    private password: string | undefined;
    /** 管理员列表 */
    private admin: Array<number> | undefined;
    /** 插件列表 */
    public pluginList: string[] | undefined;
    /** 发送错误给管理员 */
    public error_call_admin: boolean | undefined = false;

    /** 加载的插件 */
    private Plugins: any = {
        global: {},
        group: {},
        private: {},
    };
    /** 会话列表 */
    private sessions: any = {
        global: new Map(),
        group: new Map(),
        private: new Map(),
    };
    //关键词存储
    keywords: Map<string, string[]> = new Map();
    constructor(uin: number, conf?: BotConfig) {
        super(uin, conf);
        if (conf?.save_log_file == true) {
            log4js.configure({
                appenders: {
                    production: {
                        type: "dateFile",
                        filename: "log/bot.log",
                        alwaysIncludePattern: true,
                        keepFileExt: true,
                        numBackups: 30,
                    },
                },
                categories: {
                    default: { appenders: ["production"], level: "debug" },
                },
            });
        }
        //修改日志使能发送消息
        if (this.error_call_admin == true) {
            console.log(this.logger.error);
        }
        this.admin = conf?.admin;
        this.password = conf?.password;
        this.pluginList = conf?.plugin_list;
        this.error_call_admin = conf?.error_call_admin;
        this.Plugins = loadPlugin(this);
        this.sessions.global.set(
            "global",
            new Session(this, "global", "GLOBAL", this.Plugins.global)
        );
        this.sessions.group.set("group", new Session(this, "group", "GROUP", this.Plugins.group));
        this.sessions.private.set(
            "private",
            new Session(this, "private", "PRIVATE", this.Plugins.private)
        );
        this.messageListenr();
        //一天更替事件
        let nowDate = new Date();
        let timeout =
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 2 + nowDate.getDate()).getTime() -
            nowDate.getTime();
        setInterval(() => {
            this.emit("newDay");
        }, timeout);
    }
    async shutDown() {
        this.logger.warn("正在关闭...");
        if (this.isOnline()) {
            await this.logout();
            this.removeAllListeners();
            return true;
        } else {
            return false;
        }
    }
    restart() {
        this.emit("restart", this.uin + "");
    }
    getSession(sessionArea: string, sessionID: string) {
        if (this.sessions[sessionArea].has(sessionID)) {
            return this.sessions[sessionArea].get(sessionID);
        } else {
            this.logger.error(`没有找到会话`);
        }
    }
    registeEvent(event: string, path: string) {
        this.on(event, (data: any) => {
            this.triggerEvent(event, data, path);
        });
    }

    triggerEvent(event: string, data: any, _path: string) {
        this.logger.debug(`${_path} 触发了事件 ${event}`);
        let path = _path.split(".");
        let sessionID = path[0];
        switch (path[0]) {
            case "global":
                break;
            case "group":
                if (data.group_id != undefined) {
                    sessionID = data.group_id;
                    if (!this.sessions.group.has(sessionID)) {
                        this.sessions.group.set(
                            sessionID,
                            new Session(this, sessionID, "group", this.Plugins.group)
                        );
                    }
                }
                break;
            case "private":
                if (data.from_id != undefined) {
                    sessionID = data.from_id;
                    if (!this.sessions.private.has(sessionID)) {
                        this.sessions.private.set(
                            sessionID,
                            new Session(this, sessionID, "group", this.Plugins.private)
                        );
                    }
                }
                break;
            default:
                this.logger.error(`触发事件时出现了意想不到的错误`);
                this.logger.error(event);
                this.logger.error(_path);
                this.logger.error(data);
                break;
        }

        this.getSession(path[0], sessionID).event(event, data, path[1]);
    }
    messageListenr() {
        this.on("message", (message: any) => {
            //at消息
            if (message.message[0].type === "at" && message.message[0].qq == this.uin)
                this.emit("atSelfMessage", message);
            //关键词实现部分(需要重写)
            for (const key of this.keywords.keys()) {
                if (message.raw_message.search(new RegExp(key)) != -1) {
                    //消息匹配了关键词
                    let keyword = this.keywords.get(key);
                    if (keyword != undefined)
                        for (let i = 0; i < keyword.length; i++) {
                            const path = keyword[i].split(".");
                            this.logger.debug(`${path}触发了关键词:${key}`);
                            let sessionID = path[0];
                            switch (path[0]) {
                                case "global":
                                    break;
                                case "group":
                                    if (message.group_id != undefined) {
                                        sessionID = message.group_id;
                                        if (!this.sessions.group.has(sessionID)) {
                                            this.sessions.group.set(
                                                sessionID,
                                                new Session(
                                                    this,
                                                    sessionID,
                                                    "group",
                                                    this.Plugins.group
                                                )
                                            );
                                        }
                                    }
                                    break;
                                case "private":
                                    if (message.from_id != undefined) {
                                        sessionID = message.from_id;
                                        if (!this.sessions.private.has(sessionID)) {
                                            this.sessions.private.set(
                                                sessionID,
                                                new Session(
                                                    this,
                                                    sessionID,
                                                    "group",
                                                    this.Plugins.private
                                                )
                                            );
                                        }
                                    }
                                    break;
                                default:
                                    this.logger.error(`触发关键词时出现了意想不到的错误`);
                                    this.logger.error(key);
                                    this.logger.error(this.keywords.get(key));
                                    this.logger.error(message);
                                    break;
                            }
                            this.getSession(path[0], sessionID).keyword(key, message, path[1]);
                        }
                }
            }
        });
    }
    sessionCreater() {
        //  this.on("message.group", (data) => {});
    }
    //注册关键词
    registeKeyword(keyword: string, path: string) {
        let key = this.keywords.get(keyword);
        if (!this.keywords.has(keyword)) {
            this.keywords.set(keyword, []);
        }
        this.keywords.get(keyword)?.push(path);
    }
    /** 机器人登录 */
    botLogin() {
        //密码登录
        if (this.password != "" || this.password != undefined) {
            this.login(this.password);
        } else {
            //验证码登录
            this.on("system.login.qrcode", function (e) {
                //扫码后按回车登录
                process.stdin.once("data", () => {
                    this.login();
                });
            }).login();
        }
    }
    /** 获取机器人的管理员列表 */
    getAdmins(): Array<number> {
        if (this.admin == undefined) return [];
        else return this.admin;
    }
    /** 发送消息给所有管理员 */
    sendAdminMsg(message: Sendable, source?: Quotable): void {
        this.admin?.forEach((e) => {
            this.sendPrivateMsg(e, message, source).catch((err) => this.logger.error(err));
        });
    }
    async sendSelfMsg(message: Sendable, source?: Quotable) {
        let msg: MessageRet = await this.sendPrivateMsg(this.uin, message, source).catch((err) => {
            this.logger.error(err);
            throw err;
        });
        return msg.message_id;
    }
}
/** 创建一个客户端 (=new Client) */
export function createBot(uin: string, config?: BotConfig) {
    if (isNaN(Number(uin))) throw new Error(uin + " is not an OICQ account");
    return new BotClient(Number(uin), config);
}
