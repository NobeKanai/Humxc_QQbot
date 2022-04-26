/**
 * 用于支持命令, 基于keywordManager实现
 */

import { DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from "oicq/lib/events";
import { BotPlugin } from "../plugin";
import { BotClient } from "./client";
import { MsgArea, MsgRegTrigger, RegFilter, RegListener } from "./messageCenter";

export type CommandFunc = (...args: any) => any;
export type CommandCallback = (result: ReturnType<CommandFunc>, err: Error) => any;
/** 命令类型 */
export type Command = {
    /** 别名 */
    name?: string;
    /** 帮助文本 */
    help?: string;
    plugin: BotPlugin;
    area: MsgArea;
    filter: RegFilter;
    /**
     * 参数分割符
     * 在消息中使用此参数来分割为参数
     */
    separator: string;
    /**
     * 命令主体
     * 在满足"这条消息是一条命令"的情况下开始匹配此字符以识别命令
     */
    command: string;
    /**
     * 触发命令后执行的函数
     */
    func: CommandFunc;
    /**
     * 命令运行完成后的回调函数,将传递func函数的返回值和func的错误(如果有)
     */
    callback: CommandCallback;
};
export class CommandManager {
    private client: BotClient;
    public commands: Command[] = [];

    constructor(client: BotClient) {
        this.client = client;
    }

    /** 注册命令 */
    regCommand(command: Command) {
        let regStr = "^" + command.command + `($|${command.separator}+)`;
        let listener: RegListener = function (
            message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent,
            matchStr: string
        ) {
            let args = matchStr
                .replace(new RegExp(regStr + `|${command.separator}+$`, "g"), "")
                .replace(new RegExp(`${command.separator}+`, "g"), command.separator)
                .split(command.separator);
            console.log(args);
            let result: any;
            let err: any;
            try {
                result = command.func.call(command.plugin, ...args);
            } catch (error) {
                err = error;
            }

            if (command.callback !== null && result !== null) {
                command.callback.call(command.plugin, result, err);
            }
        };
        let tr: MsgRegTrigger = {
            plugin: command.plugin,
            regStr: regStr,
            area: command.area,
            filter: command.filter,
            listener: listener,
            subType: "command",
        };
        this.client.messageCenter.regMsgRegTrigger(tr);
        this.commands.push(command);
    }
}
