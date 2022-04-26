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

export type Listener = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent,
    regArray: RegExpExecArray | null
) => void;
export type Area = "global" | "private" | "group" | "discuss";
export type KeywordFilter = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
) => boolean;
export type Filter =
    | KeywordFilter
    | "allow_all"
    | "bot_admin"
    | "plugin_user"
    | "group_owner"
    | "group_admin"
    | "group_member"
    | "discuss_msg"
    | "atme";
/**
 * 关键词组件，提供对"关键词"功能的实现
 */
export interface Keyword {
    plugin: BotPlugin;
    regStr: string;
    area: Area;
    filter: Filter;
    listener: Listener;
}

export class KeywordManager {
    private keywords: Map<Area, Keyword[]> = new Map<Area, Keyword[]>();
    private client!: BotClient;
    constructor(client: BotClient) {
        this.client = client;
        this.client.on("message", this.keywordTrigger("global"));
        this.client.on("message.group", this.keywordTrigger("group"));
        this.client.on("message.private", this.keywordTrigger("private"));
        this.client.on("message.discuss", this.keywordTrigger("discuss"));
    }
    regKeyword(keyword: Keyword): void {
        let path: Area = keyword.area;
        if (!this.keywords.has(path)) {
            this.keywords.set(path, []);
        }
        this.keywords.get(path)?.push(keyword);
    }

    /** 关键词触发器 */
    private keywordTrigger(keywordPath: Area) {
        return (message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => {
            let path: Area = keywordPath;
            let _keywords: Keyword[] | undefined = this.keywords.get(path);
            if (_keywords == undefined) return;

            for (let i = 0; i < _keywords.length; i++) {
                const keyword = _keywords[i];
                let targetStr;
                for (let i = 0; i < message.message.length; i++) {
                    const msgel: MessageElem = message.message[i];
                    if (msgel.type == "text") {
                        targetStr = msgel.text;
                        break;
                    }
                }
                if (targetStr == null) continue;
                let regArray = new RegExp(keyword.regStr).exec(targetStr);
                if (regArray == null) continue;
                if (typeof keyword.filter != "string") {
                    if (keyword.filter(message)) {
                        keyword.plugin.logger.debug(
                            `uid[${message.sender.user_id}] 触发了关键词: ${path}.${keyword.regStr}`
                        );
                        keyword.listener.call(keyword.plugin, message, regArray);
                    }
                } else {
                    switch (keyword.filter) {
                        case "allow_all":
                            keyword.filter = this.getKeywordFilter("allow_all");
                            break;

                        case "bot_admin":
                            keyword.filter = this.getKeywordFilter("bot_admin")(this.client);
                            break;

                        case "plugin_user":
                            keyword.filter = this.getKeywordFilter("plugin_user")(keyword.plugin);
                            break;

                        case "group_owner":
                            keyword.filter = this.getKeywordFilter("group_owner");
                            break;

                        case "group_admin":
                            keyword.filter = this.getKeywordFilter("group_admin");
                            break;

                        case "group_member":
                            keyword.filter = this.getKeywordFilter("group_member");
                            break;

                        case "discuss_msg":
                            keyword.filter = this.getKeywordFilter("discuss_msg");
                            break;

                        case "atme":
                            keyword.filter = this.getKeywordFilter("atme");
                            break;
                        default:
                            keyword.filter = () => {
                                return false;
                            };
                            break;
                    }
                    if (keyword.filter(message)) {
                        keyword.plugin.logger.info(
                            `uid[${message.sender.user_id}] 触发了关键词: ${path}.${keyword.regStr}`
                        );
                        keyword.listener.call(this, message, regArray);
                    }
                }
            }
        };
    }

    /** 自带的关键词过滤器 */
    public getKeywordFilter(filterName: KeywordFilter): void;
    public getKeywordFilter(
        filterName:
            | "allow_all"
            | "atme"
            | "group_owner"
            | "group_admin"
            | "group_member"
            | "discuss_msg"
    ): KeywordFilter;
    public getKeywordFilter(filterName: "bot_admin"): (client: BotClient) => KeywordFilter;
    public getKeywordFilter(filterName: "plugin_user"): (plugin: BotPlugin) => KeywordFilter;
    public getKeywordFilter(filterName: any): any {
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
                return (plugin: BotPlugin): KeywordFilter => {
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
                return () => {
                    return true;
                };
        }
    }
}
