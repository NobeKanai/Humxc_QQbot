import {
    EventMap,
    GroupMessageEvent,
    PrivateMessageEvent,
    DiscussMessageEvent,
    Client,
} from "oicq";

/** 事件接口 */
export interface BotEventMap<T = any> extends EventMap {
    /** at机器人的消息 */
    "bot.atselfmsg": (
        this: T,
        event: GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent
    ) => void;
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
