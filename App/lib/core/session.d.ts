import { BotClient } from "./client";
export declare class Session {
    readonly area: string;
    private plugins;
    readonly id: string;
    constructor(client: BotClient, sessionID: string, _area: string, pluginList: any);
    event(eventName: string, data: any, pluginName: string): void;
    keyword(keyWord: string, data: any, pluginName: string): void;
}
