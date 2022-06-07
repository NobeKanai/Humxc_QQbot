/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-03
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\message\manager.ts
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
    Message,
} from "oicq";
import { Client } from "../client";
import { BotPlugin } from "../plugin/plugin";
import { getMsgFilter, MsgFilter, MsgFilterPre } from "./filter";

/**
 * @description: 消息的接收范围
 */
export type MsgArea = "global" | "private" | "group";

export type MsgHandler = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
) => void;

export type MsgTrigger = {
    /** 触发的范围 */
    area: MsgArea;
    /** 用于过滤消息的过滤器 */
    filter: MsgFilter;
    /** 用于匹配消息的文本 */
    regexp: RegExp;
    /** 满足过滤和匹配后运行的函数 */
    handler: MsgHandler;
    /** 调用 handler 的插件对象，被用于 handler.call() */
    plugin: BotPlugin;
};

/** 存储 MsgTrigger 的容器，并提供一些方法 */
class MsgTriggerContainer {
    private triggers: { [Key in MsgArea]: { [index: string]: { [index: string]: MsgTrigger } } } = {
        global: {},
        private: {},
        group: {},
    };

    /**
     * @description: 添加触发器，多次添加相同的触发器会覆盖原有的触发器。
     * @param {MsgTrigger} trigger - 需要添加的触发器
     */
    public add(trigger: MsgTrigger) {
        switch (trigger.area) {
            case "global":
            case "group":
            case "private":
                if (this.triggers[trigger.area][trigger.plugin.profile.Name] === undefined) {
                    Object.defineProperty(
                        this.triggers[trigger.area],
                        trigger.plugin.profile.Name,
                        { value: {}, writable: true, enumerable: true, configurable: true }
                    );
                }
                if (
                    this.triggers[trigger.area][trigger.plugin.profile.Name][
                        trigger.regexp.source
                    ] === undefined
                ) {
                    Object.defineProperty(
                        this.triggers[trigger.area][trigger.plugin.profile.Name],
                        trigger.regexp.source,
                        { value: {}, writable: true, enumerable: true, configurable: true }
                    );
                }
                this.triggers[trigger.area][trigger.plugin.profile.Name][trigger.regexp.source] =
                    trigger;
                return;
            default:
                throw new Error("未定义的 MsgArea");
        }
    }

    /**
     * @description: 删除指定触发器
     * @param {MsgArea} area - 触发器的 area
     * @param {string} pluginName - 触发器的插件名称
     * @param {string} regexpSource - 如果为 undefined 则删除此 area 下 pluginName 的所有触发器
     */
    public rm(area: MsgArea, pluginName: string, regexpSource: string | undefined = undefined) {
        switch (area) {
            case "global":
            case "group":
            case "private":
                if (regexpSource === undefined) {
                    if (this.triggers[area][pluginName] !== undefined)
                        delete this.triggers[area][pluginName];
                } else {
                    if (this.triggers[area][pluginName][regexpSource] !== undefined)
                        delete this.triggers[area][pluginName][regexpSource];
                }
                break;
            default:
                throw new Error("未定义的 MsgArea");
        }
    }

    /**
     * @description: 获取指定触发器
     * @param {MsgArea} area - 触发器的 area
     * @param {string} pluginName - 触发器的插件名称
     * @param {string} regexpSource - 如果为 undefined 则获取此 area 下 pluginName 的所有触发器
     */
    public get(area: MsgArea, pluginName: string, regexpSource: string): MsgTrigger;
    public get(area: MsgArea): { [pluginName: string]: { [regexpSource: string]: MsgTrigger } };
    public get(area: MsgArea, pluginName: string): { [regexpSource: string]: MsgTrigger };
    public get(
        area: MsgArea,
        pluginName: string | undefined = undefined,
        regexpSource: string | undefined = undefined
    ):
        | MsgTrigger
        | { [pluginName: string]: MsgTrigger }
        | { [pluginName: string]: { [regexpSource: string]: MsgTrigger } } {
        switch (area) {
            case "global":
            case "group":
            case "private":
                if (pluginName === undefined) {
                    return this.triggers[area];
                }
                if (regexpSource === undefined) {
                    return this.triggers[area][pluginName];
                } else {
                    return this.triggers[area][pluginName][regexpSource];
                }
            default:
                throw new Error("未定义的 MsgArea");
        }
    }
}

export class MessageManager {
    private client: Client;
    public static msgFilters: { [key in MsgFilterPre]: MsgFilter };
    public msgTriggers: MsgTriggerContainer = new MsgTriggerContainer();
    constructor(client: Client) {
        this.client = client;
        MessageManager.msgFilters = {
            allow_all: getMsgFilter("allow_all"),
            atme: getMsgFilter("atme"),
            bot_admin: getMsgFilter("bot_admin")(client),
            friend: getMsgFilter("friend")(client),
            group_admin: getMsgFilter("group_admin"),
            group_member: getMsgFilter("group_member"),
            group_owner: getMsgFilter("group_owner"),
        };
        // 监听所有消息
        this.client.oicq.on("message", (message) => {
            this.triggerTrigger("global", message);
        });

        // 监听群聊消息
        this.client.oicq.on("message.group", (message) => {
            if (MessageManager.msgFilters.bot_admin(message)) {
                client.em("admin.message.group", message);
            }

            this.triggerTrigger("group", message);
        });

        // 监听私聊消息
        this.client.oicq.on("message.private", (message) => {
            if (MessageManager.msgFilters.bot_admin(message)) {
                client.em("admin.message.private", message);
            }

            this.triggerTrigger("private", message);
        });
    }
    /**
     * @description: 触发 area 下的触发器(ಥ _ ಥ)
     */
    private triggerTrigger(
        area: MsgArea,
        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
    ) {
        // 遍历所有触发器并进行触发
        let msg = "";
        for (let i = 0; i < message.message.length; i++) {
            const _msg = message.message[i];
            if (_msg.type !== "text") {
                continue;
            }
            msg += _msg.text;
        }
        let globalTrigger = this.msgTriggers.get(area);
        for (const pluginName in globalTrigger) {
            const triggers = globalTrigger[pluginName];
            for (const key in triggers) {
                const trigger = triggers[key];
                if (trigger.filter(message)) {
                    let regResult = trigger.regexp.exec(msg);
                    if (regResult?.length !== undefined && regResult.length !== 0) {
                        trigger.handler.call(trigger.plugin, message);
                    }
                }
            }
        }
    }
}
