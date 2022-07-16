import { BotShell } from "./bot";
import { groupCommandMatcherFromText } from "./command";

export interface Plugin {
    (sh: BotShell): Promise<void>;
}

export async function pingPlugin(sh: BotShell): Promise<void> {
    sh.initializePermissions("ping");
    sh.registerGroupCommand(groupCommandMatcherFromText("ping"), async (e) => {
        sh.checkPermission(e, "ping");
        await e.reply("pong!");
    });
}
