import { Client, Config } from "oicq";
export interface BotConfig extends Config {
    password: string;
    admin: Array<number> | undefined;
    plugin_list: Array<string> | undefined;
    error_call_admin: string | undefined;
    save_log_file: string | undefined;
}
export declare class BotClient extends Client {
    /** 账户密码 */
    private password;
    /** 管理员列表 */
    private admin;
    /** 插件列表 */
    pluginList: string[] | undefined;
    /** 发送错误给管理员 */
    error_call_admin: string | undefined;
    /** 加载的插件 */
    private Plugins;
    /** 会话列表 */
    private sessions;
    keywords: Map<string, string>;
    constructor(uin: number, conf?: BotConfig);
    errorCallAdmin(error: any): void;
    shutDown(): Promise<boolean>;
    restart(): void;
    getSession(sessionArea: string, sessionID: string): any;
    registeEvent(event: string, path: string): void;
    triggerEvent(event: string, data: any, _path: string): void;
    KeywordListenr(): void;
    sessionCreater(): void;
    registeKeyword(Keyword: string, path: string): void;
    botLogin(): void;
}
/** 创建一个客户端 (=new Client) */
export declare function createBot(uin: string, config?: BotConfig): BotClient;
