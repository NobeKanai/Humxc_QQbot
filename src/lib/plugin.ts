import { BotShell } from "./bot";

export interface Plugin {
    Profile(): {};
    PlugOn(sh: BotShell): Promise<void>;
    PlugOff(): Promise<void>;
}

export class PingPlugin implements Plugin {
    private sh?: BotShell;

    Profile() {
        return {};
    }

    async PlugOn(sh: BotShell) {
        this.sh = sh;
        this.sh.registerGroupCommand("ping", async (e) => {
            await this.sh!.sendGroupMsg(e.group_id, "pong!");
        });
    }

    async PlugOff() {
        this.sh!.unregisterAllCommands();
    }
}
