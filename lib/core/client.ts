import { createClient, Client } from "oicq";

export class botClient {
  /** oicq客户端的配置 */
  private oicqConfig: any;
  /** oicq客户端 */
  private oicq: Client;
  /** 机器人的qq */
  private qq: number;
  /** 管理员列表 */
  private admin: Set<number>;
  /** 插件列表 */
  private pluginList: string[];

  constructor(botConfig: any, oicqConfig: any) {
    this.oicqConfig = oicqConfig;
    this.qq = botConfig.account;
    this.admin = new Set<number>(botConfig.admin);
    this.pluginList = botConfig.pluginList;
    this.oicq = createClient(
      this.qq,
      Object.assign(oicqConfig.general, oicqConfig[botConfig.account])
    );
  }
}
