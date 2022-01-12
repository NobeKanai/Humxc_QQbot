import {
  DiscussMessageEvent,
  GroupMessageEvent,
  PrivateMessageEvent,
} from "oicq";
import { BotClient } from "./client";
/** 消息类，基本等于message */
export class Report {
  bot: BotClient;
  message: GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent;
  constructor(
    message: GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent,
    bot: BotClient
  ) {
    this.message = message;
    this.bot = bot;
  }
  /** 判断消息的来源是否为机器人管理员 */
  isBotAdminMessage(): boolean {
    let sender_id = this.message.sender.user_id;
    return this.bot.admin.has(sender_id);
  }
}
