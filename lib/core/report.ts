import { DiscussMessage, GroupMessage, PrivateMessage } from "oicq";
import { BotClient } from "./client";
export class Report {
  bot: BotClient;
  message: GroupMessage | PrivateMessage | DiscussMessage;
  constructor(
    message: GroupMessage | PrivateMessage | DiscussMessage,
    bot: BotClient
  ) {
    this.message = message;
    this.bot = bot;
  }
  isBotAdminMessage(): boolean {
    let sender_id = this.message.sender.user_id;
    return this.bot.admin.has(sender_id);
  }
}
