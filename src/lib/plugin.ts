import { BotShell } from "./bot";

export interface Plugin {
    Profile(): {};
    PlugOn(sh: BotShell): void;
    PlugOff(): void;
}

export const pingPlugin = {
    sh: undefined as BotShell | undefined,
    Profile() {
        return {};
    },
    PlugOn(sh: BotShell): void {
        sh.registerGroupCommand("ping", async (e) => {
            await sh.sendGroupMsg(e.group_id, "pong!");
        });

        this.sh = sh;
    },
    PlugOff(): void {
        this.sh!.unregisterAllCommands();
    },
};
