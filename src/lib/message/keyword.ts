/*
 * @Author: error: git config user.name && git config user.email & please set dead value or install git
 * @Date: 2022-06-07
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\message\keyword.ts
 * @Description: 提供 [关键词] 相关内容
 *
 * Copyright (c) 2022 by error: git config user.name && git config user.email & please set dead value or install git, All Rights Reserved.
 */

import { Client } from "../client";
import { BotPlugin } from "../plugin/plugin";
import { MsgFilter, MsgFilterPre } from "./filter";
import { MessageManager, MsgArea, MsgHandler, MsgTrigger } from "./manager";

/** 关键词类，提供 "检测到关键词运行函数"的功能 */
export class Keyword {
    /** 关键词的触发器 */
    public trigger: MsgTrigger;
    /** 此关键词是否开启 */
    public isEnable: boolean = true;
    /** 原始 handler */
    private baseHandler: MsgHandler;
    /** 原始 filter */
    private baseFilter: MsgFilter;

    /**
     * @param {BotPlugin} plugin - 插件实例。
     * @param {MsgArea} area - 触发的范围
     * @param {MsgFilter | MsgFilterPre} filter - 过滤器，可以是预定义的过滤器，也可以自定义过滤器
     * @param {string | RegExp} keyword - 匹配的关键词
     * @param {MsgHandler} handler - 匹配成功后运行的函数
     */
    constructor(
        plugin: BotPlugin,
        area: MsgArea,
        filter: MsgFilter | MsgFilterPre,
        keyword: string | RegExp,
        handler: MsgHandler
    ) {
        if (typeof keyword === "string") {
            keyword = new RegExp(keyword);
        }
        if (typeof filter === "string") {
            switch (filter) {
                case "allow_all":
                case "atme":
                case "bot_admin":
                case "friend":
                case "group_admin":
                case "group_member":
                case "group_owner":
                    filter = MessageManager.msgFilters[filter];
                    break;

                default:
                    plugin.logger.warn(
                        `在处理 keyword: "${keyword.source}" 时，指定 filter 未找到，此关键词将不会生效。`
                    );
                    filter = () => {
                        return false;
                    };
                    break;
            }
        }

        this.baseHandler = (msg) => {
            plugin.logger.debug(`触发了关键词: [ ${(keyword as RegExp).source} ]`);
            handler(msg);
        };
        this.baseFilter = filter;
        this.trigger = {
            area: area,
            filter: filter,
            regexp: keyword,
            handler: this.baseHandler,
            plugin: plugin,
        };
    }

    /**
     * @description: 启用该关键词，新的关键词默认启用。
     */
    public enable() {
        if (this.isEnable) return;
        this.isEnable = true;
        this.trigger.filter = this.baseFilter;
    }

    /**
     * @description: 停用该关键词
     */
    public disable() {
        if (!this.isEnable) return;
        this.isEnable = false;
        this.trigger.filter = () => {
            return false;
        };
    }
}
export class KeywordManager {
    private client: Client;
    private msgManager: MessageManager;
    private keywords: Keyword[] = [];
    constructor(client: Client, manager: MessageManager) {
        this.client = client;
        this.msgManager = manager;
    }

    /**
     * @description: 注册关键词
     * @param {Keyword} keyword - 需要注册的关键词
     */
    public reg(keyword: Keyword) {
        this.msgManager.msgTriggers.add(keyword.trigger);
        this.keywords.push(keyword);
    }
}
