"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = exports.BotClient = void 0;
const oicq_1 = require("oicq");
const pluginLoader_1 = require("./pluginLoader");
const session_1 = require("./session");
const log4js_1 = __importDefault(require("log4js"));
class BotClient extends oicq_1.Client {
    constructor(uin, conf) {
        super(uin, conf);
        /** 发送错误给管理员 */
        this.error_call_admin = "false";
        /** 加载的插件 */
        this.Plugins = {
            global: {},
            group: {},
            private: {},
        };
        /** 会话列表 */
        this.sessions = {
            global: new Map(),
            group: new Map(),
            private: new Map(),
        };
        //关键词存储
        this.keywords = new Map();
        if (conf?.save_log_file != undefined && conf?.save_log_file == "true") {
            log4js_1.default.configure({
                appenders: {
                    production: {
                        type: "dateFile",
                        filename: "log/bot.log",
                        alwaysIncludePattern: true,
                        keepFileExt: true,
                        daysToKeep: 30,
                    },
                },
                categories: {
                    default: { appenders: ["production"], level: "debug" },
                },
            });
        }
        this.admin = conf?.admin;
        this.password = conf?.password;
        this.pluginList = conf?.plugin_list;
        this.error_call_admin = conf?.error_call_admin;
        this.Plugins = (0, pluginLoader_1.loadPlugin)(this);
        this.sessions.global.set("global", new session_1.Session(this, "global", "GLOBAL", this.Plugins.global));
        this.sessions.group.set("group", new session_1.Session(this, "group", "GROUP", this.Plugins.group));
        this.sessions.private.set("private", new session_1.Session(this, "private", "PRIVATE", this.Plugins.private));
        this.KeywordListenr();
    }
    errorCallAdmin(error) {
        this.logger.error(error);
        if (this.error_call_admin == "true") {
            if (error.name == "Error") {
                if (this.isOnline() && this.admin != undefined) {
                    for (let i = 0; i < this.admin.length; i++) {
                        this.sendPrivateMsg(this.admin[i], error.message);
                    }
                }
            }
            else {
                if (this.isOnline() && this.admin != undefined) {
                    for (let i = 0; i < this.admin.length; i++) {
                        this.sendPrivateMsg(this.admin[i], error);
                    }
                }
            }
        }
    }
    async shutDown() {
        this.logger.warn("正在关闭...");
        if (this.isOnline()) {
            await this.logout();
            this.removeAllListeners();
            return true;
        }
        else {
            return false;
        }
    }
    restart() {
        this.emit("restart", this.uin + "");
    }
    getSession(sessionArea, sessionID) {
        if (this.sessions[sessionArea].has(sessionID)) {
            return this.sessions[sessionArea].get(sessionID);
        }
        else {
            this.errorCallAdmin(`没有找到会话`);
        }
    }
    registeEvent(event, path) {
        this.on(event, (data) => {
            this.triggerEvent(event, data, path);
        });
    }
    triggerEvent(event, data, _path) {
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
                        this.sessions.group.set(sessionID, new session_1.Session(this, sessionID, "group", this.Plugins.group));
                    }
                }
                break;
            case "private":
                if (data.from_id != undefined) {
                    sessionID = data.from_id;
                    if (!this.sessions.private.has(sessionID)) {
                        this.sessions.private.set(sessionID, new session_1.Session(this, sessionID, "group", this.Plugins.private));
                    }
                }
                break;
            default:
                this.errorCallAdmin(`触发事件时出现了意想不到的错误`);
                this.errorCallAdmin(event);
                this.errorCallAdmin(_path);
                this.errorCallAdmin(data);
                break;
        }
        this.getSession(path[0], sessionID).event(event, data, path[1]);
    }
    KeywordListenr() {
        this.on("message", (data) => {
            for (const key of this.keywords.keys()) {
                if (data.raw_message.search(new RegExp(key)) != -1) {
                    //消息匹配了关键词
                    let path = this.keywords.get(key)?.split(".");
                    this.logger.debug(`${this.keywords.get(key)}触发了关键词:${key}`);
                    let sessionID = path[0];
                    switch (path[0]) {
                        case "global":
                            break;
                        case "group":
                            if (data.group_id != undefined) {
                                sessionID = data.group_id;
                                if (!this.sessions.group.has(sessionID)) {
                                    this.sessions.group.set(sessionID, new session_1.Session(this, sessionID, "group", this.Plugins.group));
                                }
                            }
                            break;
                        case "private":
                            if (data.from_id != undefined) {
                                sessionID = data.from_id;
                                if (!this.sessions.private.has(sessionID)) {
                                    this.sessions.private.set(sessionID, new session_1.Session(this, sessionID, "group", this.Plugins.private));
                                }
                            }
                            break;
                        default:
                            this.errorCallAdmin(`触发关键词时出现了意想不到的错误`);
                            this.errorCallAdmin(key);
                            this.errorCallAdmin(this.keywords.get(key));
                            this.errorCallAdmin(data);
                            break;
                    }
                    this.getSession(path[0], sessionID).keyword(key, data, path[1]);
                }
            }
        });
    }
    sessionCreater() {
        this.on("message.group", (data) => { });
    }
    registeKeyword(Keyword, path) {
        this.keywords.set(Keyword, path);
    }
    //** 机器人登录 */
    botLogin() {
        //密码登录
        if (this.password != "" || this.password != undefined) {
            this.login(this.password);
        }
        else {
            //验证码登录
            this.on("system.login.qrcode", function (e) {
                //扫码后按回车登录
                process.stdin.once("data", () => {
                    this.login();
                });
            }).login();
        }
    }
}
exports.BotClient = BotClient;
/** 创建一个客户端 (=new Client) */
function createBot(uin, config) {
    if (isNaN(Number(uin)))
        throw new Error(uin + " is not an OICQ account");
    return new BotClient(Number(uin), config);
}
exports.createBot = createBot;
