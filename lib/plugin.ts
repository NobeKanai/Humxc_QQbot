/**
 * 机器人插件的基本实现，机器人插件应继承此类
 */
import { BotClient } from "./core/client";
import { DiscussMessageEvent, GroupMessageEvent, Logger, PrivateMessageEvent } from "oicq";
import log4js from "log4js";
import { getJsonData, saveJsonData } from "./pluginFather";
import {
    MsgArea,
    RegFilter,
    MsgRegTrigger,
    RegListener,
    RegFilterFunc,
    RegFilterDef,
} from "./core/messageCenter";
import { Command, CommandFunc } from "./core/commandManager";
import { Keyword } from "./core/keywordManager";

export class BotPluginError {
    private static MainName = "BotPluginError";
    static UnknowPluginUserType = class extends Error {
        name: string = BotPluginError.MainName + ": " + "UnknowPluginUserType";
    };
    static UserExist = class extends Error {
        name: string = BotPluginError.MainName + ": " + "UserExist";
    };
    static UserNotExist = class extends Error {
        name: string = BotPluginError.MainName + ": " + "UserNotExist";
    };
}
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
/** BotPluginProfile的实现 */
class PluginProfile implements BotPluginProfile {
    PluginName: string = "Plugin";
    BotVersion: string = "0.0.0";
    PluginVersion: string = "0.0.0";
    Info: string = "未配置的插件";
}
/** 插件的用户类型接口 */
export interface BotPluginUser {
    uid: uid;
    type: "Person" | "Group";
}
/** config的接口 */
export interface BotPluginConfig {
    Users: BotPluginUser[];
}
type uid = number;
export class BotPlugin {
    public users: { group: Map<uid, BotPluginUser>; person: Map<uid, BotPluginUser> } = {
        group: new Map<uid, BotPluginUser>(),
        person: new Map<uid, BotPluginUser>(),
    };
    public logger: Logger | PluginLogger;
    public pluginProfile: PluginProfile;
    public client: BotClient;
    public config: BotPluginConfig;
    private defaultConfig: BotPluginConfig;
    constructor(
        client: BotClient,
        pluginProfile: BotPluginProfile,
        defaultConfig: BotPluginConfig
    ) {
        this.config = defaultConfig;
        this.defaultConfig = defaultConfig;
        this.client = client;
        this.pluginProfile = pluginProfile;
        // 设置日志器
        if (this.client.errorCallAdmin == true) {
            var _log = log4js.getLogger(
                `[${this.client.apk.display}:${this.client.uin}] [${this.pluginProfile.PluginName}]`
            );
            _log.level = this.client.config.log_level;
            this.logger = _log;
            this.logger = new PluginLogger(this.client, this.pluginProfile.PluginName, _log);
        } else {
            var _log = log4js.getLogger(
                `[${this.client.apk.display}:${this.client.uin}] [${this.pluginProfile.PluginName}]`
            );
            _log.level = this.client.config.log_level;
            this.logger = _log;
        }

        /** 初始化config */
        if (!this.updateConfigFromFile()) {
            this.logger.error("在初始化 config 时出现异常");
        }
    }

    /** 注册关键词 */
    public regKeyword(
        regStr: string,
        area: MsgArea,
        filter: RegFilter,
        listener: RegListener,
        name?: string,
        help?: string
    ): void {
        let keyword: Keyword = {
            plugin: this,
            regStr: regStr,
            listener: listener,
            filter: filter,
            area: area,
            subType: "keyword",
            name: name,
            help: help,
        };
        this.client.keywordManager.regKeyword(keyword);
    }

    /** 注册命令 */
    public regCommand(
        command: string,
        area: MsgArea,
        filter: RegFilter,
        func: CommandFunc,
        separator: string = " ",
        name?: string,
        help?: string
    ): void {
        let c: Command = {
            plugin: this,
            area: area,
            filter: filter,
            separator: separator,
            command: command,
            func: func,
        };
        this.client.commandManager.regCommand(c);
    }

    /** 是否有指定群组用户 */
    public hasGroupUser(uid: uid): boolean {
        return this.users.group.has(uid);
    }

    /** 是否有指定个人用户 */
    public hasPersonUser(uid: uid): boolean {
        return this.users.person.has(uid);
    }

    /** 添加插件用户 */
    public addUser<T extends BotPluginUser>(user: T): boolean {
        switch (user.type) {
            case "Group":
                if (this.users.group.has(user.uid)) {
                    throw new BotPluginError.UserExist("uid=" + user.uid.toString());
                } else {
                    this.users.group.set(user.uid, user);
                    return true;
                }
            case "Person":
                if (this.users.person.has(user.uid)) {
                    throw new BotPluginError.UserExist("uid=" + user.uid.toString());
                } else {
                    this.users.person.set(user.uid, user);
                    return true;
                }
            default:
                throw new BotPluginError.UnknowPluginUserType(user.type);
        }
    }

    /** 删除插件用户 */
    public rmUser<T extends BotPluginUser>(user: T): boolean {
        switch (user.type) {
            case "Group":
                if (!this.users.group.has(user.uid)) {
                    throw new BotPluginError.UserNotExist("uid=" + user.uid.toString());
                } else {
                    this.users.group.delete(user.uid);
                    return true;
                }
            case "Person":
                if (!this.users.person.has(user.uid)) {
                    throw new BotPluginError.UserNotExist("uid=" + user.uid.toString());
                } else {
                    this.users.person.delete(user.uid);
                    return true;
                }
            default:
                throw new BotPluginError.UnknowPluginUserType(user.type);
        }
    }

    /** 更新修改用户 */
    public uppdateUser<T extends BotPluginUser>(user: T): boolean {
        switch (user.type) {
            case "Group":
                if (!this.users.group.has(user.uid)) {
                    throw new BotPluginError.UserNotExist("uid=" + user.uid.toString());
                } else {
                    this.users.group.set(user.uid, user);
                    return true;
                }
            case "Person":
                if (!this.users.person.has(user.uid)) {
                    throw new BotPluginError.UserNotExist("uid=" + user.uid.toString());
                } else {
                    this.users.person.set(user.uid, user);
                    return true;
                }
            default:
                throw new BotPluginError.UnknowPluginUserType(user.type);
        }
    }

    /** 将this.users保存到config, 保存插件的config到文件*/
    public saveConfig(): boolean {
        let userList: BotPluginUser[] = [];
        for (const user of this.users.group.values()) {
            userList.push(user);
        }
        for (const user of this.users.person.values()) {
            userList.push(user);
        }
        this.config.Users = userList;
        try {
            saveJsonData(this, "config", this.config);
        } catch (error) {
            this.logger.error(error);
            return false;
        }
        return true;
    }

    /** 从config中更新Users到this.users */
    public updateUserFromConfig(): void {
        let _users = this.config.Users;
        for (let i = 0; i < _users.length; i++) {
            const user = _users[i];
            switch (user.type) {
                case "Group":
                    this.users.group.set(user.uid, user);
                    break;
                case "Person":
                    this.users.person.set(user.uid, user);
                    break;
                default:
                    this.logger.warn("未定义的插件用户类型: " + user.type);
                    break;
            }
        }
    }

    /** 从配置文件重新加载config */
    public updateConfigFromFile(): boolean {
        try {
            this.config = getJsonData(this, "config", this.defaultConfig);
        } catch (error) {
            this.logger.error(error);
        }

        this.updateUserFromConfig();
        return true;
    }

    /** 从KeywordManager获取 KeywordFilter */
    public getKeywordFilter(filterName: RegFilterDef): RegFilterFunc {
        switch (filterName) {
            case "allow_all":
                return this.client.messageCenter.getRegFilter("allow_all");

            case "bot_admin":
                return this.client.messageCenter.getRegFilter("bot_admin")(this.client);

            case "plugin_user":
                return this.client.messageCenter.getRegFilter("plugin_user")(this);

            case "group_owner":
                return this.client.messageCenter.getRegFilter("group_owner");

            case "group_admin":
                return this.client.messageCenter.getRegFilter("group_admin");

            case "group_member":
                return this.client.messageCenter.getRegFilter("group_member");

            case "discuss_msg":
                return this.client.messageCenter.getRegFilter("discuss_msg");

            case "atme":
                return this.client.messageCenter.getRegFilter("atme");

            default:
                this.client.logger.error(
                    `不存在的触发器类型: '${filterName}', 请检查, 此命令不会生效.`
                );
                return function () {
                    return false;
                };
        }
    }
}

/** 经过修改的日志器, 用于实现this.client.errorCallAdmin  */
class PluginLogger {
    private logger!: Logger;
    private client!: BotClient;
    private pluginName!: string;
    constructor(client: BotClient, pluginName: string, logger: Logger) {
        this.client = client;
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
        this.client.sendAdminMsg("有插件出现错误\n" + this.pluginName + ":\n" + msg);
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
