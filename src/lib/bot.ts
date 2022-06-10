import log4js from "log4js";
import { Logger } from "log4js";
import { Client, GroupMessageEvent, Sendable } from "oicq";
import { pingPlugin } from "./plugin";

export type GroupCommmandMatcher = (e: GroupMessageEvent) => boolean;
export type GroupCommmandCallback = (e: GroupMessageEvent) => Promise<void>;

export class Bot {
    logger: Logger;
    client: Client;

    groupCommandHandlers: Array<[GroupCommmandMatcher, GroupCommmandCallback] | undefined> = [];

    constructor(client: Client) {
        this.client = client;
        this.logger = log4js.getLogger("Bot");
        this.logger.level = log4js.levels.ALL;

        client.once("system.login.qrcode", function () {
            process.stdin.once("data", () => {
                this.login();
            });
        }).login();
    }

    async start() {
        await new Promise<void>((resolve) => {
            this.client.once("system.online", () => {
                resolve();
            });
        });
        this.logger.info("Bot is now online!");

        try {
            pingPlugin.PlugOn(new BotShell("ping", this, this.logger));
            this.logger.info("plugin [ping] is enabled");
        } catch (err) {
            this.logger.warn("failed to enable plugin [ping]", err);
        }

        this.client.on("message.group", (e) => {
            for (let handler of this.groupCommandHandlers) {
                if (handler && handler[0](e)) {
                    handler[1](e).catch((err) => {
                        this.logger.error(`unhandled error: ${err}`);
                    });
                }
            }
        });
    }
}

export class BotShell {
    private bot: Bot;
    private groupCommands = new Set<number>();
    private name: string;

    public logger: Logger;

    public constructor(name: string, bot: Bot, logger: Logger) {
        this.bot = bot;
        this.logger = logger;
        this.name = name;
    }

    public async sendGroupMsg(group_id: number, message: Sendable) {
        return await this.bot.client.sendGroupMsg(group_id, message);
    }

    private firstAvalible(arr: any[]): number {
        let i = 0;
        while (arr[i] !== undefined) i++;
        return i;
    }

    public registerGroupCommand(cmd: string, callback: GroupCommmandCallback): number {
        let cmd_id = this.firstAvalible(this.bot.groupCommandHandlers);
        this.bot.groupCommandHandlers[cmd_id] = [(e) => {
            return cmd === e.raw_message;
        }, callback];

        this.groupCommands.add(cmd_id);
        return cmd_id;
    }

    public unregisterGroupCommand(cmd_id: number) {
        if (this.groupCommands.has(cmd_id)) {
            this.bot.groupCommandHandlers[cmd_id] = undefined;
            this.groupCommands.delete(cmd_id);
        } else {
            throw new Error(`cmd ${cmd_id} does not belong to plugin [${this.name}]`);
        }
    }

    public unregisterAllCommands() {
        for (let gcid of this.groupCommands) {
            this.bot.groupCommandHandlers[gcid] = undefined;
        }
        this.groupCommands.clear();
    }
}
