/**
 * 机器人插件的基本实现，机器人插件应继承此类
 */
import { BotClient } from "./core/client";
import { DiscussMessageEvent, GroupMessageEvent, Logger, PrivateMessageEvent, User } from "oicq";
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
type GetElementType<T extends any[]> = T extends (infer U)[] ? U : never;
export class PluginError extends Error {
    private static MainName = "PluginError";
    static UnknowPluginUserType = class extends Error {
        constructor(type: PluginUserType) {
            super(type);
            this.name = PluginError.MainName + ": " + "UnknowPluginUserType";
        }
    };
    static UserAlreadyExist = class extends Error {
        constructor(user: BotPluginUser) {
            super(JSON.stringify(user));
            this.name = PluginError.MainName + ": " + "UserAlreadyExist";
        }
    };
    static UserNotExist = class extends Error {
        constructor(uid: uid, type: PluginUserType) {
            super(`${type} user: ${uid} `);
            this.name = PluginError.MainName + ": " + "UserNotExist";
        }
    };
    constructor(msg: string) {
        super(msg);
        this.name = PluginError.MainName;
    }
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
export type PluginUserType = "Person" | "Group";
export interface BotPluginUser {
    uid: uid;
    type: PluginUserType;
}

/** config的接口 */
export interface BotPluginConfig {
    Users: Array<BotPluginUser>;
}
type uid = number;
export class BotPlugin<T extends BotPluginConfig> {
    public users: { group: Map<uid, BotPluginUser>; person: Map<uid, BotPluginUser> } = {
        group: new Map<uid, BotPluginUser>(),
        person: new Map<uid, BotPluginUser>(),
    };
    public logger: Logger | PluginLogger;
    public pluginProfile: PluginProfile;
    public client: BotClient;
    public config: T;
    private defaultConfig: T;
    constructor(client: BotClient, pluginProfile: BotPluginProfile, defaultConfig: T) {
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
        this.config = getJsonData(this, "config", this.defaultConfig);
        this.updateUserFromConfig();
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
        help?: string,
        showHelp?: boolean,
        separator: string = " "
    ): void {
        let c: Command = {
            plugin: this,
            area: area,
            filter: filter,
            separator: separator,
            command: command,
            func: func,
            help: help,
            showHelp: false,
        };
        if (showHelp == null && help != null) {
            c.showHelp = true;
        }
        this.client.commandManager.regCommand(c);
    }

    /** 用户是否存在 */
    public hasUser(uid: uid, type: PluginUserType): boolean {
        switch (type) {
            case "Group":
                return this.users.group.has(uid);

            case "Person":
                return this.users.person.has(uid);

            default:
                throw new PluginError.UnknowPluginUserType(type);
        }
    }

    /** 获取用户 */
    public getUser<K extends GetElementType<T["Users"]>>(uid: uid, type: PluginUserType): K {
        let u: BotPluginUser | undefined;
        switch (type) {
            case "Group":
                u = this.users.group.get(uid);
                if (u !== undefined) {
                    return <K>(<unknown>u);
                } else {
                    throw new PluginError.UserNotExist(uid, type);
                }

            case "Person":
                u = this.users.person.get(uid);
                if (u !== undefined) {
                    return <K>(<unknown>u);
                } else {
                    throw new PluginError.UserNotExist(uid, type);
                }

            default:
                throw new PluginError.UnknowPluginUserType(type);
        }
    }

    /** 添加插件用户 */
    public addUser<K extends GetElementType<T["Users"]>>(user: K): boolean {
        switch (user.type) {
            case "Group":
                if (this.users.group.has(user.uid)) {
                    throw new PluginError.UserAlreadyExist(user);
                } else {
                    this.users.group.set(user.uid, user);
                    return true;
                }
            case "Person":
                if (this.users.person.has(user.uid)) {
                    throw new PluginError.UserAlreadyExist(user);
                } else {
                    this.users.person.set(user.uid, user);
                    return true;
                }
            default:
                throw new PluginError.UnknowPluginUserType(user.type);
        }
    }

    /** 删除插件用户 */
    public rmUser(uid: uid, type: PluginUserType): boolean {
        switch (type) {
            case "Group":
                if (!this.users.group.has(uid)) {
                    throw new PluginError.UserNotExist(uid, type);
                } else {
                    this.users.group.delete(uid);
                    return true;
                }
            case "Person":
                if (!this.users.person.has(uid)) {
                    throw new PluginError.UserNotExist(uid, type);
                } else {
                    this.users.person.delete(uid);
                    return true;
                }
            default:
                throw new PluginError.UnknowPluginUserType(type);
        }
    }

    /** 更新修改用户 */
    public uppdateUser<K extends GetElementType<T["Users"]>>(user: K): boolean {
        switch (user.type) {
            case "Group":
                if (!this.users.group.has(user.uid)) {
                    throw new PluginError.UserNotExist(user.uid, user.type);
                } else {
                    this.users.group.set(user.uid, user);
                    return true;
                }
            case "Person":
                if (!this.users.person.has(user.uid)) {
                    throw new PluginError.UserNotExist(user.uid, user.type);
                } else {
                    this.users.person.set(user.uid, user);
                    return true;
                }
            default:
                throw new PluginError.UnknowPluginUserType(user.type);
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
        return this.saveJsonData("config", this.config);
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

    /** 保存对象到 JSON 文件 */
    saveJsonData(fileName: string, obj: any): boolean {
        try {
            saveJsonData(this, fileName, obj);
        } catch (error) {
            this.logger.error(error);
            return false;
        }
        return true;
    }

    /** 从 JSON 文件获取对象 */
    getJsonData<T>(fileName: string, defaultData: T): T {
        return getJsonData(this, fileName, defaultData);
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

            case "friend":
                return this.client.messageCenter.getRegFilter("friend")(this.client);

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
