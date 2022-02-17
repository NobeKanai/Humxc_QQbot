import { BotClient } from "./core/client";
export declare function getConig(bot: BotClient, pluginName: string, defaultConfig?: any): any;
export declare function saveConfig(bot: BotClient, pluginName: string, config: any): void;
export declare function getConfigDir(bot: BotClient, pluginName: string): string;
export declare function getData(bot: BotClient, pluginName: string, defaultData?: any): any;
export declare function saveData(bot: BotClient, pluginName: string, data: any): void;
