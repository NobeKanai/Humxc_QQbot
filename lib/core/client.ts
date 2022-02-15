import { createClient, Client, MessageEvent, Config } from "oicq";
export interface BotConfig extends Config {
  password: string;
  admin: Array<number> | undefined;
  pluginList: Array<string> | undefined;
}
export class BotClient extends Client {
  /** 账户密码 */
  private password: string | undefined;
  /** 管理员列表 */
  private admin: Array<number> | undefined;
  /** 插件列表 */
  private pluginList: string[] | undefined;
  /** 加载的插件 */
  private globalPlugin: Array<any> = [];
  private privatePlugin: Array<any> = [];
  private groupPlugin: Array<any> = [];
  constructor(uin: number, conf?: BotConfig) {
    super(uin, conf);
    this.admin = conf?.admin;
    this.password = conf?.password;
    this.pluginList = conf?.pluginList;
  }
  async shutDown() {
    this.logger.warn("正在关闭...");
    if (this.isOnline()) {
      await this.logout();
      this.removeAllListeners();
      return true;
    } else {
      return false;
    }
  }
  botLogin() {
    if (this.password != "" || this.password != undefined) {
      this.login(this.password);
    } else {
      //TODO:验证码登录
    }
  }
}
/** 创建一个客户端 (=new Client) */
export function createBot(uin: number, config?: BotConfig) {
  if (isNaN(Number(uin))) throw new Error(uin + " is not an OICQ account");
  return new BotClient(Number(uin), config);
}
