/**
 * 机器人插件的基本实现，机器人插件应继承此类
 */
import { BotClient } from "./core/client";
import { Logger } from "oicq";
import log4js from "log4js";
/** 插件配置接口,作为插件应实现此接口 */
export interface BotPluginProfile {
    /** 插件名称 */
    PluginName: string;
    /** 插件版本 */
    PluginVersion: string;
    /** 机器人版本 */
    BotVersion: string;
    /** 描述消息 */
    Info: string;
}
class PluginProfile implements BotPluginProfile {
    PluginName: string = "Plugin";
    BotVersion: string = "0.0.0";
    PluginVersion: string = "0.0.0";
    Info: string = "未配置的插件";
}
export class BotPlugin {
    public logger!: Logger | PluginLogger;
    public pluginProfile: PluginProfile = new PluginProfile();
    public bot!: BotClient;
    public data: any = {};
    public config: any = {};
    constructor(bot: BotClient, pluginProfile: PluginProfile) {
        this.bot = bot;
        this.pluginProfile = pluginProfile;
        if (this.bot.errorCallAdmin == true) {
            var _log = log4js.getLogger(
                `[${this.bot.apk.display}:${this.bot.uin}] [${this.pluginProfile.PluginName}]`
            );
            _log.level = this.bot.config.log_level;
            this.logger = _log;
            this.logger = new PluginLogger(this.bot, this.pluginProfile.PluginName, _log);
        } else {
            var _log = log4js.getLogger(
                `[${this.bot.apk.display}:${this.bot.uin}] [${this.pluginProfile.PluginName}]`
            );
            _log.level = this.bot.config.log_level;
            this.logger = _log;
        }
    }
}
class PluginLogger {
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
        if (err.message == undefined) msg = err.toString();
        else msg = err.message;
        this.bot.sendAdminMsg("有插件出现错误\n" + this.pluginName + ":\n" + msg);
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
