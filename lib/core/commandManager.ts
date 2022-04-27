/**
 * 用于支持命令, 基于keywordManager实现
 */

import { DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from "oicq/lib/events";
import { BotPlugin } from "../plugin";
import { BotClient } from "./client";
import { MsgArea, MsgRegTrigger, RegFilter, RegListener } from "./messageCenter";

export class CommandHelp {}
/**
 * Command 的错误, 此错误在 CommandFunc 中抛出时不会打印在日志上
 */
export class CommandError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "CommandErr";
    }
}

/**
 * 命令的运行主体, 返回值会直接回复给命令发送者
 * 在此函数抛出的 CommandError 不会被打印到日志
 */
export type CommandFunc = (
    message: GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent,
    ...args: any
) => any;
/** 命令类型 */
export type Command = {
    /** 帮助文本 */
    help?: string;
    /** 出现错误时显示帮助 */
    showHelp: boolean;
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
};
export class CommandManager {
    private client: BotClient;
    public commands: Command[] = [];

    constructor(client: BotClient) {
        this.client = client;
    }

    /** 注册命令 */
    regCommand(command: Command) {
        command.plugin.logger.info(`正在注册命令: ${command.command}`);
        let regStr = "^" + command.command + `($|${command.separator}+)`;
        let listener: RegListener = function (
            message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent,
            matchStr: string
        ) {
            let args = matchStr
                .replace(new RegExp(regStr + `|${command.separator}+$`, "g"), "")
                .replace(new RegExp(`${command.separator}+`, "g"), command.separator)
                .split(command.separator);
            let repmsg: string | null = null;
            try {
                repmsg = command.func.call(command.plugin, message, ...args);
            } catch (error) {
                repmsg = `执行命令时出现异常: \n` + (error as Error).message;
                if (command.showHelp === true) {
                    if (command.help === null) {
                        repmsg += `\n该命令没有可显示的帮助`;
                    } else {
                        repmsg += "\n" + command.help;
                    }
                }
                if (!(error instanceof CommandError)) {
                    command.plugin.logger.error(error);
                }
            }

            if (repmsg != null) {
                message.reply(repmsg).catch((err) => {
                    command.plugin.logger.error(err);
                });
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
