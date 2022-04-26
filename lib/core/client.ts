/**
 * 主要的客户端，在外部被引用时，此类一般被命名为bot
 */
import {
    Client,
    Config,
    Sendable,
    Quotable,
    MessageRet,
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
    EventMap,
    DiscussMessage,
    GroupMessage,
    PrivateMessage,
} from "oicq";
import { PluginManager } from "./pluginManager";
import log4js from "log4js";
import { messageCenter } from "./messageCenter";
import { KeywordManager } from "./keywordManager";
import { CommandManager } from "./commandManager";
interface BotConfig extends Config {
    //机器人的QQ密码
    password: string | undefined;
    //管理员列表
    admin: Array<number> | undefined;
    //插件列表
    plugin_list: Array<string> | undefined;
    //是否将错误消息发送给管理员
    error_call_admin: boolean | undefined;
    //是否保存日志到文件
    save_log_file: boolean | undefined;
}
/** 事件接口 */
export interface BotEventMap<T = any> extends EventMap {
    /** 新的一天! */
    "bot.newday": (this: T, event: null) => void;
}
export interface BotClient extends Client {
    on<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
    on<S extends string | symbol>(
        event: S & Exclude<S, keyof BotEventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
    once<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
    once<S extends string | symbol>(
        event: S & Exclude<S, keyof BotEventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
}
export class BotClient extends Client {
    /** 账户密码 */
    private password: string | undefined;
    /** 管理员列表 */
    private admin: Array<number> = [];
    /** 插件列表 */
    public pluginList: string[] = [];
    /** 发送错误给管理员 */
    public errorCallAdmin: boolean = false;
    /** 消息中心 */
    public messageCenter: messageCenter = new messageCenter(this);
    /** 关键词管理器 */
    public keywordManager: KeywordManager = new KeywordManager(this);
    /** 插件管理器 */
    public pluginManager: PluginManager = new PluginManager(this);
    /** 命令管理器 */
    public commandManager: CommandManager = new CommandManager(this);
    constructor(uin: number, conf?: BotConfig) {
        super(uin, conf);
        if (conf?.save_log_file == true) {
        }
        if (conf != undefined) {
            if (conf.password != undefined) this.password = conf.password;
            if (conf.admin != undefined) this.admin = conf.admin;
            if (conf.plugin_list != undefined) this.pluginList = conf.plugin_list;
            if (conf.error_call_admin != undefined) this.errorCallAdmin = conf.error_call_admin;
            if (conf.save_log_file == true)
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

        //一天更替事件
        let nowDate = new Date();
        let timeout =
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 2 + nowDate.getDate()).getTime() -
            nowDate.getTime();
        setInterval(() => {
            this.emit("bot.newday");
        }, timeout);
        this.pluginManager.loadPlugin();
    }
    /** 机器人登录 */
    botLogin() {
        //密码登录
        if (this.password != "" && this.password != undefined) {
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

    /** 判断是否管理员 */
    isAdmin(uid: number) {
        return new Set(this.admin).has(uid);
    }
    /** 判断消息是否at自己的消息 */
    isAtSelf(message: PrivateMessage | GroupMessage | DiscussMessage): boolean {
        if (message.message_type == "private") {
            return false;
        } else if (message.message[0].type == "at" && message.message[0].qq == this.uin) {
            return true;
        }
        return false;
    }
    /** 判断是否为好友 */
    isFriend(qq: number): boolean {
        return this.fl.has(qq);
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
