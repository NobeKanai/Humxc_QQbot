import { BotClient } from "./core/client";
import { Logger } from "oicq";
import log4js from "log4js";
export type LoadArea = "GLOBAL" | "GROUP" | "PRIVATE";
/** 插件配置接口,作为插件应实现此接口 */
export interface BotPluginConfig {
    /** 插件名称 */
    PluginName: string;
    /** 插件版本 */
    PluginVersion: string;
    /** 机器人版本 */
    BotVersion: string;
    /** 插件加载时的数据隔离 */
    LoadArea: LoadArea;
    /** 描述消息 */
    Info: string;
    /** 注册的事件 */
    Event?: string[];
    /** 注册的关键词 */
    Keyword?: string[];
}
class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    PluginName: string = "Plugin";
    BotVersion: string = "0.0.0";
    PluginVersion: string = "0.0.0";
    Info: string = "未配置的插件";
}
export class BotPlugin {
    public logger!: Logger | BotLogger;
    public pluginConfig: BotPluginConfig = new PluginConfig();
    public bot!: BotClient;
    public data: any = {};
    public config: any = {};
    constructor(bot: BotClient, pluginConfig: PluginConfig) {
        this.bot = bot;
        this.pluginConfig = pluginConfig;
        if (this.bot.error_call_admin == true) {
            var _log = log4js.getLogger(
                `[${this.bot.apk.display}:${this.bot.uin}] [${this.pluginConfig.PluginName}]`
            );
            _log.level = this.bot.config.log_level;
            this.logger = _log;
            this.logger = new BotLogger(this.bot, this.pluginConfig.PluginName, _log);
        } else {
            var _log = log4js.getLogger(
                `[${this.bot.apk.display}:${this.bot.uin}] [${this.pluginConfig.PluginName}]`
            );
            _log.level = this.bot.config.log_level;
            this.logger = _log;
        }
    }
    /** 触发事件时会调用插件的event方法 */
    event(eventName: string, data: any): any {}
    /** 触发关键词时会调用插件的keyword方法 */
    keyword(keyword: string, data: any): any {}
}
class BotLogger {
    private logger!: Logger;
    private bot!: BotClient;
    private pluginName!: string;
    constructor(bot: BotClient, pluginName: string, logger: Logger) {
        this.bot = bot;
        this.logger = logger;
        this.pluginName = pluginName;
    }
    debug(msg: any, ...args: any[]) {
        this.logger.debug(msg, ...args);
    }
    error(err: any, ...args: any[]) {
        this.logger.error(err, ...args);
        let msg;
        if (err.mesage == undefined) msg = err.toString();
        else msg = err.message;
        this.bot.sendAdminMsg("有插件出现错误\n" + this.pluginName + ":\n" + msg.toString());
    }
    fatal(msg: any, ...args: any[]) {
        this.logger.fatal(msg, ...args);
    }
    info(msg: any, ...args: any[]) {
        this.logger.info(msg, ...args);
    }
    mark(msg: any, ...args: any[]) {
        this.logger.mark(msg, ...args);
    }
    trace(msg: any, ...args: any[]) {
        this.logger.trace(msg, ...args);
    }
    warn(msg: any, ...args: any[]) {
        this.logger.warn(msg, ...args);
    }
}
