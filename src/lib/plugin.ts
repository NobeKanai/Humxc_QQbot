import { BotShell } from "./bot";

export interface Plugin {
    (sh: BotShell): Promise<void>;
}

export async function pingPlugin(sh: BotShell): Promise<void> {
    sh.registerGroupCommand("ping", "ping", async (e) => {
        await e.reply("pong!");
    });
}
