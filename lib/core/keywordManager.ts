import { BotClient } from "./client";
import { MsgRegTrigger } from "./messageCenter";

/**
 * 提供命令注册功能,基本等于messageCenter
 */

/** 关键词类型 */
export interface Keyword extends MsgRegTrigger {
    /** 关键词的别名 */
    name?: string;
    /** 帮助文本 */
    help?: string;
}
export class KeywordManager {
    private client: BotClient;
    public keywords: Keyword[] = [];
    constructor(client: BotClient) {
        this.client = client;
    }
    public regKeyword(keyword: Keyword) {
        this.client.messageCenter.regMsgRegTrigger(keyword);
        this.keywords.push(keyword);
    }
}
