/**
 * messageCenter
 * msgTrigger: 通过正则表达式匹配来处理消息, 为keywordManager和commandManager提供支持
 */

import {
    DiscussMessage,
    DiscussMessageEvent,
    Group,
    GroupMessage,
    GroupMessageEvent,
    MessageElem,
    PrivateMessage,
    PrivateMessageEvent,
    User,
} from "oicq";
import { BotPlugin, BotPluginUser } from "../plugin";
import { BotClient } from "./client";

export type RegListener = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent,
    matchStr: string
) => void;
export type MsgArea = "global" | "private" | "group" | "discuss";

/** 自定义过滤器 */
export type RegFilterFunc = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
) => boolean;

/** 预定义过滤器 */
export type RegFilterDef =
    | "allow_all"
    | "bot_admin"
    | "plugin_user"
    | "group_owner"
    | "group_admin"
    | "group_member"
    | "discuss_msg"
    | "atme";
export type RegFilter = RegFilterFunc | RegFilterDef;
/**
 * 关键词组件，提供对"关键词"功能的实现
 */
export interface MsgRegTrigger {
    plugin: BotPlugin;
    regStr: string;
    area: MsgArea;
    filter: RegFilter;
    listener: RegListener;
    subType: "keyword" | "command";
}

export class messageCenter {
    private msgTriggers: Map<MsgArea, MsgRegTrigger[]> = new Map<MsgArea, MsgRegTrigger[]>();
    private client!: BotClient;
    constructor(client: BotClient) {
        this.client = client;
        this.client.on("message", this.callMsgRegTrigger("global"));
        this.client.on("message.group", this.callMsgRegTrigger("group"));
        this.client.on("message.private", this.callMsgRegTrigger("private"));
        this.client.on("message.discuss", this.callMsgRegTrigger("discuss"));
    }
    regMsgRegTrigger(tr: MsgRegTrigger): void {
        let path: MsgArea = tr.area;
        if (!this.msgTriggers.has(path)) {
            this.msgTriggers.set(path, []);
        }
        this.msgTriggers.get(path)?.push(tr);
    }

    /** 触发器的触发器 */
    private callMsgRegTrigger(msgArea: MsgArea) {
        return (message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => {
            let trigers: MsgRegTrigger[] | undefined = this.msgTriggers.get(msgArea);
            if (trigers == undefined) return;

            for (let i = 0; i < trigers.length; i++) {
                const tr = trigers[i];
                let matchStr;
                for (let i = 0; i < message.message.length; i++) {
                    const msgel: MessageElem = message.message[i];
                    if (msgel.type == "text") {
                        matchStr = msgel.text;
                        break;
                    }
                }
                if (matchStr == null) continue;
                let regArray = new RegExp(tr.regStr, "g").exec(matchStr);
                if (regArray == null) continue;
                if (typeof tr.filter == "string") {
                    switch (tr.filter) {
                        case "allow_all":
                            tr.filter = this.getRegFilter("allow_all");
                            break;

                        case "bot_admin":
                            tr.filter = this.getRegFilter("bot_admin")(this.client);
                            break;

                        case "plugin_user":
                            tr.filter = this.getRegFilter("plugin_user")(tr.plugin);
                            break;

                        case "group_owner":
                            tr.filter = this.getRegFilter("group_owner");
                            break;

                        case "group_admin":
                            tr.filter = this.getRegFilter("group_admin");
                            break;

                        case "group_member":
                            tr.filter = this.getRegFilter("group_member");
                            break;

                        case "discuss_msg":
                            tr.filter = this.getRegFilter("discuss_msg");
                            break;

                        case "atme":
                            tr.filter = this.getRegFilter("atme");
                            break;

                        default:
                            tr.plugin.logger.error(
                                `不存在的触发器类型: '${tr.filter}', 请检查 ${tr.subType}: ${tr.regStr}. 此 ${tr.subType} 已被拦截`
                            );
                            tr.filter = function () {
                                return false;
                            };
                            break;
                    }
                }
                if ((tr.filter as RegFilterFunc)(message)) {
                    tr.plugin.logger.debug(
                        `uid[${message.sender.user_id}] 触发了 ${tr.subType} : ${msgArea}.${tr.regStr}`
                    );
                    tr.listener.call(tr.plugin, message, matchStr);
                }
            }
        };
    }

    /** 获取预定义的过滤器 */
    public getRegFilter(filterName: MsgRegTrigger): void;
    public getRegFilter(
        filterName:
            | "allow_all"
            | "atme"
            | "group_owner"
            | "group_admin"
            | "group_member"
            | "discuss_msg"
    ): RegFilterFunc;
    public getRegFilter(filterName: "bot_admin"): (client: BotClient) => RegFilterFunc;
    public getRegFilter(filterName: "plugin_user"): (plugin: BotPlugin) => RegFilterFunc;
    public getRegFilter(filterName: any): any {
        switch (filterName) {
            case "allow_all":
                return () => {
                    return true;
                };

            case "bot_admin":
                return function (client: BotClient) {
                    return function (
                        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                    ) {
                        return client.isAdmin(message.sender.user_id);
                    };
                };

            case "atme":
                return function (
                    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                ) {
                    if (
                        (message.message_type == "group" || message.message_type == "discuss") &&
                        message.atme
                    ) {
                        return true;
                    }
                    return false;
                };

            case "plugin_user":
                return (plugin: BotPlugin): RegFilter => {
                    return function (
                        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                    ) {
                        switch (message.message_type) {
                            case "group":
                                return plugin.hasGroupUser(message.sender.user_id);
                            case "private":
                                return plugin.hasPersonUser(message.sender.user_id);
                            default:
                                return false;
                        }
                    };
                };

            case "group_owner":
                return function (
                    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                ) {
                    if (message.message_type == "group") {
                        return message.sender.role == "owner";
                    } else return false;
                };

            case "group_admin":
                return function (
                    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                ) {
                    if (message.message_type == "group") {
                        return message.sender.role == "admin" || message.sender.role == "owner";
                    } else return false;
                };

            case "group_member":
                return function (
                    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                ) {
                    if (message.message_type == "group") {
                        return (
                            message.sender.role == "member" ||
                            message.sender.role == "admin" ||
                            message.sender.role == "owner"
                        );
                    } else return false;
                };

            case "discuss_msg":
                return function (
                    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                ) {
                    if (message.message_type == "discuss") {
                        return true;
                    }
                    return false;
                };
            default:
                this.client.logger.error(
                    `不存在的触发器类型: '${filterName}', 请检查, 此次命令不会生效.`
                );
                return function () {
                    return false;
                };
        }
    }
}
