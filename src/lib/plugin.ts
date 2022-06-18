import { BotShell } from "./bot";

export interface Plugin {
    (sh: BotShell): Promise<void>;
}

export async function pingPlugin(sh: BotShell): Promise<void> {
    sh.registerGroupCommand("ping", "717552407:admin", async (e) => {
        await sh.sendGroupMsg(e.group_id, "pong!");
    });
}
