/**
 * 用于支持命令, 基于keywordManager实现
 */

import { DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from "oicq/lib/events";
import { BotPlugin } from "../plugin";
import { BotClient } from "./client";
import { Area, Filter, Keyword, KeywordFilter, KeywordManager, Listener } from "./keywordManager";

export type CommandFunc = (...args: any) => any;
export type CommandCallback = (result: ReturnType<CommandFunc>, err: Error) => any;
/** 命令类型 */
export type Command = {
    plugin: BotPlugin;
    area: Area;
    filter: Filter;
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

    constructor(client: BotClient) {
        this.client = client;
    }

    /** 注册命令 */
    regCommand(command: Command) {
        let regStr = "^" + command.command + `($|${command.separator}+)`;
        let listener: Listener = function (
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
        let keyword: Keyword = {
            plugin: command.plugin,
            regStr: regStr,
            area: command.area,
            filter: command.filter,
            listener: listener,
            subtype: "command",
        };
        this.client.keywordManager.regKeyword(keyword);
    }
}
