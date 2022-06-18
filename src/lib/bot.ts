import { Level } from "level";
import log4js from "log4js";
import { Logger } from "log4js";
import { Client, GroupMessageEvent, Sendable } from "oicq";
import { cfg } from "./config";
import { pingPlugin, Plugin } from "./plugin";

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
            const shell = new BotShell(
                plugin,
                this,
                logger,
                this.db.sublevel(plugin.name, { valueEncoding: "json" }) as any,
            );

            try {
                await plugin.func(shell);

                plugin.shell = shell;
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
    private pluginInfo: PluginInfo;
    private db: Level<string, any>;

    readonly logger: Logger;

    constructor(pluginInfo: PluginInfo, bot: Bot, logger: Logger, db: Level) {
        this.bot = bot;
        this.logger = logger;
        this.pluginInfo = pluginInfo;
        this.db = db;
    }

    async sendGroupMsg(group_id: number, message: Sendable) {
        return await this.bot.client.sendGroupMsg(group_id, message);
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

    registerGroupCommandWithRegex(exp: RegExp, permissions: string, callback: GroupCommmandCallback): number {
        return this.registerGroupCommand(
            (text) => {
                return exp.test(text);
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

    unregisterAll() {
        this.unregisterAllCommands();
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
