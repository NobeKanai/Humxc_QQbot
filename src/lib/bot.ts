import { Level } from "level";
import log4js, { Logger } from "log4js";
import { Client, Forwardable, GroupMessageEvent, PrivateMessage, Sendable, User } from "oicq";
import { cfg } from "./config";
import { pingPlugin, Plugin } from "./plugin";
import { b23Live } from "./plugins/b23live";
import { giveMe20 } from "./plugins/giveme20";
import { sleep, timestamp } from "./utils";

export type GroupCommmandMatcher = (e: GroupMessageEvent) => boolean;
export type GroupCommmandCallback = (e: GroupMessageEvent) => Promise<void>;

interface PluginInfo {
    name: string;
    func: Plugin;
    shell?: BotShell;
}

const plugins: PluginInfo[] = [
    {
        name: "ping",
        func: pingPlugin,
    },
    {
        name: "giveme20",
        func: giveMe20,
    },
    {
        name: "b23live",
        func: b23Live,
    },
];

export class Bot {
    readonly logger: Logger;
    readonly client: Client;
    readonly db: Level;

    groupCommandHandlers: Array<[GroupCommmandMatcher, GroupCommmandCallback] | undefined> = [];

    constructor(client: Client, db: Level) {
        this.client = client;
        this.db = db;
        this.logger = log4js.getLogger("Bot");
        this.logger.level = log4js.levels.ALL;

        client.once("system.login.qrcode", function () {
            process.stdin.once("data", () => {
                this.login();
            });
        }).login();
    }

    private async startCore(sh: BotShell): Promise<void> {
        let status: State<{ [key: string]: boolean }> = await sh.get("status", {});

        const registerDisablePlugin = async (plugin: PluginInfo) => {
            const eid = sh.registerGroupCommand(`disable ${plugin.name}`, "", async (e) => {
                plugin.shell!.unregisterAll();

                status.val[plugin.name] = false;
                await status.update();

                sh.unregisterGroupCommand(eid);
                sh.sendGroupMsg(e.group_id, `Plugin [${plugin.name}] is now disabled.`);

                await registerEnablePlugin(plugin);
            });
        };
        const registerEnablePlugin = async (plugin: PluginInfo) => {
            const eid = sh.registerGroupCommand(`enable ${plugin.name}`, "", async (e) => {
                const logger = log4js.getLogger(plugin.name);
                logger.level = log4js.levels.ALL;

                const shell = new BotShell(
                    plugin,
                    this,
                    logger,
                    this.db.sublevel(plugin.name, { valueEncoding: "json" }) as any,
                );

                await plugin.func(shell);
                plugin.shell = shell;

                status.val[plugin.name] = true;
                await status.update();

                sh.unregisterGroupCommand(eid);
                sh.sendGroupMsg(e.group_id, `Plugin [${plugin.name}] is now enabled.`);

                await registerDisablePlugin(plugin);
            });
        };

        for (const plugin of plugins) {
            if (status.val[plugin.name] === undefined) {
                status.val[plugin.name] = true;
            } else if (!status.val[plugin.name]) {
                registerEnablePlugin(plugin);
                continue;
            }

            const logger = log4js.getLogger(plugin.name);
            logger.level = log4js.levels.ALL;
            const shell = new BotShell(
                plugin,
                this,
                logger,
                this.db.sublevel(plugin.name, { valueEncoding: "json" }) as any,
            );

            try {
                await plugin.func(shell);
                plugin.shell = shell;
                this.logger.info("plugin [%s] is started", plugin.name);
                registerDisablePlugin(plugin);
            } catch (err) {
                shell.unregisterAll();

                this.logger.error(`failed to enable plugin [${plugin.name}]`, err);
                // TODO: call admin
            }
        }

        await status.update();
    }

    async start() {
        await new Promise<void>((resolve) => {
            this.client.once("system.online", () => {
                resolve();
            });
        });
        this.logger.info("Bot is now online!");

        this.client.on("message.group", (e) => {
            for (let handler of this.groupCommandHandlers) {
                if (handler && handler[0](e)) {
                    handler[1](e).catch((err) => {
                        this.logger.error(`unhandled error: ${err}`);
                    });
                }
            }
        });

        await this.startCore(
            new BotShell(
                { name: "core", func: this.start },
                this,
                this.logger,
                this.db.sublevel("core", { valueEncoding: "json" }) as any,
            ),
        );
    }

    firstAvalible(arr: any[]): number {
        let i = 0;
        while (arr[i] !== undefined) i++;
        return i;
    }
}

export class State<T> {
    private db: Level<string, any>;
    private key: string;
    val: T;

    constructor(db: Level, key: string, val: T) {
        this.db = db;
        this.key = key;
        this.val = val;
    }

    async update() {
        await this.db.put(this.key, this.val);
    }
}

export class BotShell {
    private bot: Bot;
    private groupCommands = new Set<number>();
    private intervalJobs = new Set<number>();
    private pluginInfo: PluginInfo;
    private db: Level<string, any>;
    private self: User;

    readonly logger: Logger;

    constructor(pluginInfo: PluginInfo, bot: Bot, logger: Logger, db: Level) {
        this.bot = bot;
        this.logger = logger;
        this.pluginInfo = pluginInfo;
        this.db = db;
        this.self = bot.client.pickUser(bot.client.uin);
    }

    async sendGroupMsg(group_id: number, message: Sendable) {
        return await this.bot.client.sendGroupMsg(group_id, message);
    }

    async sendPrivateMsg(user_id: number, message: Sendable) {
        return await this.bot.client.sendPrivateMsg(user_id, message);
    }

    async sendSelfMsg(message: Sendable) {
        return await this.sendPrivateMsg(this.bot.client.uin, message);
    }

    async sendAdminsMsg(message: Sendable) {
        for (const admin of cfg.admins) {
            await this.sendPrivateMsg(admin, message);
        }
    }

    async sendForwardMsgToGroup(group_id: number, msgs: Sendable[]) {
        let message: Forwardable[] = msgs.map((val) => {
            return {
                user_id: this.bot.client.uin,
                message: val,
                nickname: this.bot.client.nickname,
            };
        });
        return await this.sendGroupMsg(group_id, await this.bot.client.makeForwardMsg(message));
    }

    registerGroupCommand(
        cmd: string | ((text: string) => boolean),
        permissions: string,
        callback: GroupCommmandCallback,
    ): number {
        let matcher: GroupCommmandMatcher;

        if (typeof cmd === "string") {
            matcher = (e) => cmd === e.raw_message;
        } else {
            matcher = (e) => cmd(e.raw_message);
        }

        return this.registerGroupCommandWithGroupCommandMatcher(matcher, permissions, callback);
    }

    registerGroupCommandWithRegex(exp: RegExp | string, permissions: string, callback: GroupCommmandCallback): number {
        let _exp: RegExp;
        if (typeof exp === "string") {
            if (!exp.startsWith("^")) exp = "^".concat(exp);
            if (!exp.endsWith("$")) exp = exp.concat("$");
            _exp = new RegExp(exp);
        } else {
            _exp = exp;
        }
        return this.registerGroupCommand(
            (text) => {
                return _exp.test(text);
            },
            permissions,
            callback,
        );
    }

    registerGroupCommandWithGroupCommandMatcher(
        matcher: GroupCommmandMatcher,
        permissions: string,
        callback: GroupCommmandCallback,
    ): number {
        const cmd_id = this.bot.firstAvalible(this.bot.groupCommandHandlers);
        this.bot.groupCommandHandlers[cmd_id] = [(e) => {
            return checkPermission(permissions, e) && matcher(e);
        }, callback];
        this.groupCommands.add(cmd_id);
        return cmd_id;
    }

    unregisterGroupCommand(cmd_id: number) {
        if (this.groupCommands.has(cmd_id)) {
            this.bot.groupCommandHandlers[cmd_id] = undefined;
            this.groupCommands.delete(cmd_id);
        } else {
            throw new Error(`cmd ${cmd_id} does not belong to plugin [${this.pluginInfo.name}]`);
        }
    }

    unregisterAllCommands() {
        for (let gcid of this.groupCommands) {
            this.bot.groupCommandHandlers[gcid] = undefined;
        }
        this.groupCommands.clear();
    }

    private jobs: Array<undefined | 1 | 2> = [];

    private nextJobIdx(): number {
        let i = 0;
        while (this.jobs[i] !== undefined) i++;
        this.jobs[i] = 1;
        return i;
    }

    registerJobWithInterval(ms: number, callback: () => Promise<void>): number {
        const job_id = this.nextJobIdx();
        const f = async () => {
            while (this.jobs[job_id] === 1) {
                await sleep(ms);
                if (this.jobs[job_id] === 1) {
                    try {
                        await callback();
                    } catch (err: any) {
                        this.logger.error("in interval job: ", err);
                        this.sendAdminsMsg(err.toString());
                    }
                }
            }
            this.jobs[job_id] = undefined;
        };
        f();
        this.intervalJobs.add(job_id);
        return job_id;
    }

    unregisterJobWithInterval(...job_ids: number[]) {
        for (let job_id of job_ids) {
            this.jobs[job_id] = 2;
            this.intervalJobs.delete(job_id);
        }
    }

    unregisterAll() {
        this.unregisterAllCommands();
        this.unregisterJobWithInterval(...this.intervalJobs);
    }

    async get<T = any>(key: string, default_val: T): Promise<State<T>> {
        try {
            return new State<T>(this.db, key, await this.db.get(key));
        } catch (err: any) {
            if (err.code === "LEVEL_NOT_FOUND") {
                return new State<T>(this.db, key, default_val);
            }
            throw err;
        }
    }

    async set<T = any>(key: string, val: T): Promise<void> {
        return await this.db.put(key, val);
    }
}

/*
* <group_id>:<user_id>
* <group_id>:owner
* <group_id>:admin
* <group_id>:member
* all:member
*/
function checkPermission(permissions: string, e: GroupMessageEvent): boolean {
    if (cfg.admins.indexOf(e.sender.user_id) !== -1) return true;

    for (const permission of permissions.split(",")) {
        const idx = permission.indexOf(":");
        if (idx === -1) continue;

        let group_id = permission.substring(0, idx);
        if (group_id === "all" || group_id === String(e.group_id)) {
            let tag = permission.substring(idx + 1);
            switch (tag) {
                case String(e.sender.user_id):
                    return true;
                case "owner":
                    if (e.sender.role === "owner") return true;
                    break;
                case "admin":
                    if (e.sender.role === "admin" || e.sender.role === "owner") return true;
                    break;
                case "member":
                    return true;
            }
        }
    }

    return false;
}
