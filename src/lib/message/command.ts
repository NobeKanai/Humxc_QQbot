/*
 * @Author: error: git config user.name && git config user.email & please set dead value or install git
 * @Date: 2022-06-07
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-07
 * @FilePath: \QQbot\src\lib\message\command.ts
 * @Description:提供 [命令] 相关内容
 *
 * Copyright (c) 2022 by error: git config user.name && git config user.email & please set dead value or install git, All Rights Reserved.
 */
import { DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from "oicq";
import { Client } from "../client";
import { BotPlugin } from "../plugin/plugin";
import { MsgFilter, MsgFilterPre } from "./filter";
import { MessageManager, MsgArea, MsgHandler, MsgTrigger } from "./manager";

/**
 * @description: 绑定命令的函数。
 * @param {PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent} message - 调用者的消息事件
 * @param {string[]} args - 除命令本身之外的字符串会被按空格解析成字符串数组传递
 * @return {boolean} 表示此命令是否执行成功，这个值是自由的。如果返回 false，将给调用者回复命令的描述 Command.description
 */
export type CommandFunc = (
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent,
    ...args: string[]
) => boolean;

/** 命令类，提供类似于 "命令行程序的交互" */
export class Command {
    /** 关键词的触发器 */
    public trigger: MsgTrigger;
    /** 此关键词是否开启 */
    public isEnable: boolean = true;
    /** 原始 handler */
    private baseHandler: MsgHandler;
    /** 原始 filter */
    private baseFilter: MsgFilter;
    /** 原始命令 */
    public command: string;
    /** 命令描述 */
    private description: string;
    /** 子命令 */
    public subCommand: Command | undefined;

    /**
     * @param {BotPlugin} plugin - 插件实例。
     * @param {MsgArea} area - 触发的范围
     * @param {MsgFilter | MsgFilterPre} filter - 过滤器，可以是预定义的过滤器，也可以自定义过滤器
     * @param {string} command - 匹配的命令，使用字符串。
     * @param {MsgHandler} func - 匹配成功后运行的函数
     * @param {string} description - 命令的描述，用于显示帮助，尽量简短。
     */
    constructor(
        plugin: BotPlugin,
        area: MsgArea,
        filter: MsgFilter | MsgFilterPre,
        command: string,
        description: string,
        func: CommandFunc
    ) {
        this.command = command;
        this.description = description;

        // 提取出主命令
        let _cmdArr = command.split(" ");
        let _command: RegExp | undefined = undefined;
        for (let i = 0; i < _cmdArr.length; i++) {
            if (_cmdArr[i] !== "") {
                _command = new RegExp("^" + _cmdArr[i]);
                break;
            }
        }
        if (_command === undefined) {
            throw new Error(`命令 [${command}] 无法提取出有效的关键词`);
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
                        `在处理 command: "${_command.source}" 时，指定 filter 未找到，此命令将不会生效。`
                    );
                    filter = () => {
                        return false;
                    };
                    break;
            }
        }

        this.baseHandler = (msg) => {
            plugin.logger.debug(`触发了命令: [ ${(_command as RegExp).source} ]`);

            // 解析参数
            let args: string[] = [];
            for (let i = 0; i < msg.message.length; i++) {
                const _msg = msg.message[i];
                if (_msg.type === "text") {
                    args = _msg.text.split(/ +/g);
                    let count = args.indexOf(this.command) + 1;
                    for (let i = 0; i < count; i++) {
                        args.shift();
                    }
                    break;
                }
            }

            // 运行子命令
            if (args[0] === this.subCommand?.command) {
                this.subCommand.trigger.handler.call(this.subCommand.trigger.plugin, msg);
                return;
            }

            // 回复命令的描述
            if (!func(msg, ...args)) {
                msg.reply(this.description);
            }
        };
        this.baseFilter = filter;
        this.trigger = {
            area: area,
            filter: filter,
            regexp: _command,
            handler: this.baseHandler,
            plugin: plugin,
        };
    }

    /**
     * @description: 启用该命令，新的命令默认启用。
     */
    public enable() {
        if (this.isEnable) return;
        this.isEnable = true;
        this.trigger.filter = this.baseFilter;
    }

    /**
     * @description: 停用该命令
     */
    public disable() {
        if (!this.isEnable) return;
        this.isEnable = false;
        this.trigger.filter = () => {
            return false;
        };
    }
    public regSubCommand(subCmd: string, description: string, func: CommandFunc) {
        this.subCommand = new Command(
            this.trigger.plugin,
            this.trigger.area,
            this.trigger.filter,
            subCmd,
            description,
            func
        );
    }
}
export class CommandManager {
    private client: Client;
    private msgManager: MessageManager;
    private commands: Command[] = [];
    constructor(client: Client, manager: MessageManager) {
        this.client = client;
        this.msgManager = manager;
    }

    /**
     * @description: 注册关键词
     * @param {Command} command - 需要注册的关键词
     */
    public reg(command: Command) {
        this.msgManager.msgTriggers.add(command.trigger);
        this.commands.push(command);
    }
}
