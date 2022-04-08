import {
    DiscussMessage,
    DiscussMessageEvent,
    Group,
    GroupMessage,
    GroupMessageEvent,
    PrivateMessage,
    PrivateMessageEvent,
} from "oicq";
import { BotClient } from "./client";

/**
 * 关键词组件，提供对"关键词"功能的实现
 */
interface Keywords {
    /** 对全局 "message" 事件的匹配 */
    global: Map<
        string,
        ((message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => void)[]
    >;
    /** 对 "message.private" 事件的匹配 */
    private: Map<
        string,
        ((message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => void)[]
    >;
    /** 对 "message.group" 事件的匹配 */
    group: Map<
        string,
        ((message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => void)[]
    >;
    /** 对 "message.discuss" 事件的匹配 */
    discuss: Map<
        string,
        ((message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => void)[]
    >;
}
export class KeywordManager {
    private keywords: Keywords = {
        global: new Map(),
        private: new Map(),
        group: new Map(),
        discuss: new Map(),
    };
    private client!: BotClient;
    constructor(client: BotClient) {
        this.client = client;
        this.client.on(
            "message",
            (message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => {
                let targetKeyword: Map<
                    string,
                    ((
                        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
                    ) => void)[]
                >;
                switch (message.message_type) {
                    case "private":
                        targetKeyword = this.keywords.private;
                        break;
                    case "group":
                        targetKeyword = this.keywords.group;
                        break;
                    case "discuss":
                        targetKeyword = this.keywords.discuss;
                        break;
                    default:
                        targetKeyword = this.keywords.global;
                        break;
                }
                for (const [key, value] of targetKeyword) {
                    if (new RegExp(key).exec(message.raw_message) != null) {
                        value.forEach(
                            (
                                listener: (
                                    message:
                                        | PrivateMessageEvent
                                        | GroupMessageEvent
                                        | DiscussMessageEvent
                                ) => void
                            ) => {
                                Reflect.apply(listener, this, [message]);
                            }
                        );
                    }
                }
                for (const [key, value] of this.keywords.global) {
                    if (new RegExp(key).exec(message.raw_message) != null) {
                        value.forEach(
                            (
                                listener: (
                                    message:
                                        | PrivateMessageEvent
                                        | GroupMessageEvent
                                        | DiscussMessageEvent
                                ) => void
                            ) => {
                                Reflect.apply(listener, this, [message]);
                            }
                        );
                    }
                }
            }
        );
    }
    regKeyword(
        keyword: string,
        listener: (message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => void,
        area: "global" | "private" | "group" | "discuss" = "global"
    ) {
        let targetKeyword: Map<string, Function[]>;
        switch (area) {
            case "private":
                targetKeyword = this.keywords.private;
                break;
            case "group":
                targetKeyword = this.keywords.group;
                break;
            case "discuss":
                targetKeyword = this.keywords.discuss;
                break;
            default:
                targetKeyword = this.keywords.global;
                break;
        }

        if (!targetKeyword.has(keyword)) {
            targetKeyword.set(keyword, []);
        }
        targetKeyword.get(keyword)?.push(listener);
    }

    //无用的方法
    private emKeyword(
        keyword: string,
        message: PrivateMessage | GroupMessage | DiscussMessage,
        area: "global" | "private" | "group" | "discuss" = "global"
    ) {
        let targetKeyword: Map<string, Function[]>;
        switch (message?.message_type) {
            case "private":
                targetKeyword = this.keywords.private;
                break;
            case "group":
                targetKeyword = this.keywords.group;
                break;
            case "discuss":
                targetKeyword = this.keywords.discuss;
                break;
            default:
                targetKeyword = this.keywords.global;
                break;
        }
    }
}
