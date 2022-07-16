import { Level } from "level";
import log4js, { Logger } from "log4js";
import { Client, Forwardable, GroupMessageEvent, Sendable } from "oicq";
import {
    GroupCommandCallback,
    GroupCommandHandler,
    GroupCommandMatcher,
    groupCommandMatcherFromRegex,
    groupCommandMatcherFromText,
} from "./command";
import { cfg } from "./config";
import { pingPlugin, Plugin } from "./plugin";
import { b23Live } from "./plugins/b23live";
import { giveMe20 } from "./plugins/giveme20";
import { closestWord, sleep } from "./utils";

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

    groupCommandHandlers: Array<GroupCommandHandler | undefined> = [];
    groupCommandPermissions: State<{ [key: string]: string[] }> | undefined;

    constructor(client: Client, db: Level) {
        this.client = client;
        this.db = db;
        this.logger = log4js.getLogger("Bot");
        this.logger.level = log4js.levels.ALL;

        client.once("system.login.qrcode", function () {
            process.stdin.once("data", () => {
                this.login();
            });
        }).login(cfg.password || undefined);
    }

    private async startCore(sh: BotShell): Promise<void> {
        this.client.on("message.group", (e) => {
            for (const handler of this.groupCommandHandlers) {
                if (handler && handler.matcher(e)) {
                    handler.callback(e).catch((err) => {
                        switch (err) {
                            case ErrNotAuthorized:
                                break;
                            default:
                                this.logger.trace(`Unhandled error: ${err}`);
                                sh.sendAdminsMsg(`Unhandled error: ${err}`);
                        }
                    });
                }
            }
        });

        let status: State<{ [key: string]: boolean }> = await sh.get("status", {});
        this.groupCommandPermissions = await sh.get("permissions", {});

        const registerDisablePlugin = async (plugin: PluginInfo) => {
            const eid = sh.registerGroupCommand(
                groupCommandMatcherFromText(`disable ${plugin.name}`),
                async (e) => {
                    plugin.shell!.unregisterAll();

                    status.val[plugin.name] = false;
                    await status.update();

                    sh.unregisterGroupCommand(eid);
                    sh.sendGroupMsg(e.group_id, `Plugin [${plugin.name}] is now disabled.`);

                    await registerEnablePlugin(plugin);
                },
            );
        };
        const registerEnablePlugin = async (plugin: PluginInfo) => {
            const eid = sh.registerGroupCommand(
                groupCommandMatcherFromText(`enable ${plugin.name}`),
                async (e) => {
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
                },
            );
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

        // dynamic permissions
        const hintCommandName = async (command_name: string, e: GroupMessageEvent): Promise<string> => {
            const word = closestWord(
                command_name,
                Object.keys(this.groupCommandPermissions!.val),
            );
            if (word === undefined) {
                await e.reply(`Command name "${command_name}" not found`);
                throw "Not Found";
            }

            return new Promise(async (resolve, reject) => {
                try {
                    const cmd_id = sh.registerGroupCommand(
                        groupCommandMatcherFromRegex(/^(是|嗯|y|yes)$/i),
                        async () => {
                            resolve(word);
                        },
                    );
                    await e.reply(`Command name "${command_name}" not found. Did you mean "${word}"?`);
                    setTimeout(() => {
                        sh.unregisterGroupCommand(cmd_id);
                        reject("TimeOut");
                    }, 30000);
                } catch (err) {
                    await e.reply(`Command name "${command_name}" not found`);
                    reject(err);
                }
            });
        };

        sh.registerGroupCommand(
            groupCommandMatcherFromRegex("grant [0-9:a-z]+ \\S+"),
            async (e) => {
                let [, permission, command_name] = e.raw_message.split(" ");
                const perms = this.groupCommandPermissions!.val;
                if (perms[command_name] === undefined) {
                    try {
                        command_name = await hintCommandName(command_name, e);
                    } catch (err) {
                        sh.logger.debug(err);
                        return;
                    }
                }

                if (permission.indexOf(":") === -1) permission = `${e.group_id}:${permission}`;

                perms[command_name].push(permission);
                await this.groupCommandPermissions!.update();
                await e.reply("Done");
            },
        );

        sh.registerGroupCommand(
            groupCommandMatcherFromRegex("revoke [0-9:a-z]+ \\S+"),
            async (e) => {
                let [, permission, command_name] = e.raw_message.split(" ");
                const perms = this.groupCommandPermissions!.val;
                if (perms[command_name] === undefined) {
                    try {
                        command_name = await hintCommandName(command_name, e);
                    } catch (err) {
                        sh.logger.debug(err);
                        return;
                    }
                }
                if (permission.indexOf(":") === -1) permission = `${e.group_id}:${permission}`;

                const idx = perms[command_name].indexOf(permission);
                if (idx === -1) {
                    await e.reply(`Permission "${permission}" does not exists`);
                } else {
                    perms[command_name].splice(idx, 1);
                    await this.groupCommandPermissions!.update();
                    await e.reply("Done");
                }
            },
        );

        sh.registerGroupCommand(
            groupCommandMatcherFromRegex("perm(ission)?s? \\S+"),
            async (e) => {
                let command_name = e.raw_message.split(" ")[1];
                const perms = this.groupCommandPermissions!.val;
                if (perms[command_name] === undefined) {
                    try {
                        command_name = await hintCommandName(command_name, e);
                    } catch (err) {
                        sh.logger.debug(err);
                        return;
                    }
                }

                await e.reply(
                    `Command: ${command_name}\n- super admin\n${
                        perms[command_name].map((v) => {
                            return `- ${v}`;
                        }).join("\n")
                    }`,
                );
            },
        );

        await status.update();
    }

    async start() {
        await new Promise<void>((resolve) => {
            this.client.once("system.online", () => {
                resolve();
            });
        });
        this.logger.info("Bot is now online!");

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

    readonly logger: Logger;

    constructor(pluginInfo: PluginInfo, bot: Bot, logger: Logger, db: Level) {
        this.bot = bot;
        this.logger = logger;
        this.pluginInfo = pluginInfo;
        this.db = db;
    }

    initializePermissions(...names: string[]) {
        for (const name of names) {
            if (this.bot.groupCommandPermissions!.val[name] === undefined) {
                this.bot.groupCommandPermissions!.val[name] = [];
            }
        }
        this.bot.groupCommandPermissions!.update();
    }

    checkPermission(e: GroupMessageEvent, name: string) {
        if (this.bot.groupCommandPermissions!.val[name] === undefined) {
            this.bot.groupCommandPermissions!.val[name] = [];
            this.bot.groupCommandPermissions!.update();
        }
        if (!checkPermission(this.bot.groupCommandPermissions!.val[name], e)) {
            throw ErrNotAuthorized;
        }
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

    async makeForwardMsg(msgs: Sendable[]) {
        let message: Forwardable[] = msgs.map((val) => {
            return {
                user_id: this.bot.client.uin,
                message: val,
                nickname: this.bot.client.nickname,
            };
        });
        return await this.bot.client.makeForwardMsg(message);
    }

    registerGroupCommand(
        matcher: GroupCommandMatcher,
        callback: GroupCommandCallback,
    ): number {
        const cmd_id = this.bot.firstAvalible(this.bot.groupCommandHandlers);
        this.bot.groupCommandHandlers[cmd_id] = {
            matcher: matcher,
            callback: callback,
        };
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

export const ErrNotAuthorized = new Error("Not Authorized.");

/*
* <group_id>:<user_id>
* <group_id>:owner
* <group_id>:admin
* <group_id>:member
* all:member
*/
function checkPermission(permissions: string[], e: GroupMessageEvent): boolean {
    if (cfg.admins.indexOf(e.sender.user_id) !== -1) return true;

    for (const permission of permissions) {
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
