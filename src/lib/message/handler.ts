/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-03
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-04
 * @FilePath: \QQbot\src\lib\message\handler.ts
 * @Description: 消息处理器，通过监听 oicq 的 message 事件来给机器人客户端提供消息相关的功能。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import {
    PrivateMessage,
    GroupMessage,
    DiscussMessage,
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
} from "oicq";
import { Client } from "../client";
import { BotPlugin } from "../plugin/plugin";
import { getMsgFilter, MsgFilter, MsgFilterPre } from "./filter";

/**
 * @description: 消息的接收范围
 */
export type MsgArea = "global" | "private" | "group";

export type MsgHandl = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
) => void;
export type MsgTrigger = {
    // 插件实例
    plugin: BotPlugin;
    // 触发的范围
    area: MsgArea;
    // 用于过滤消息的过滤器
    filter: MsgFilter;
    // 用于匹配消息的文本
    regexp: RegExp | string;
    handel: MsgHandl;
};
export class MessageHandeler {
    private client: Client;
    private msgFilters: { [key in MsgFilterPre]: MsgFilter };
    constructor(client: Client) {
        this.client = client;

        this.msgFilters = {
            allow_all: getMsgFilter("allow_all"),
            atme: getMsgFilter("atme"),
            bot_admin: getMsgFilter("bot_admin")(client),
            friend: getMsgFilter("friend")(client),
            group_admin: getMsgFilter("group_admin"),
            group_member: getMsgFilter("group_member"),
            group_owner: getMsgFilter("group_owner"),
        };

        // 监听群聊消息
        this.client.oicq.on("message.group", (message) => {
            if (this.msgFilters.bot_admin(message)) {
                client.em("admin.message.group", message);
            }
        });

        // 监听私聊消息
        this.client.oicq.on("message.private", (message) => {
            if (this.msgFilters.bot_admin(message)) {
                client.em("admin.message.private", message);
            }
        });
    }
}
