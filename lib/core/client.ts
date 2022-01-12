import { createClient, Client, MessageEvent } from "oicq";
import { loadPlugin } from "./pluginLoader";
export class BotClient {
  /** oicq客户端的配置 */
  private oicqConfig: any;
  /** oicq客户端 */
  private oicq: Client;
  /** 机器人的qq */
  public readonly qq: number;
  /** 管理员列表 */
  public readonly admin: Set<number>;
  /** 插件列表 */
  private pluginList: string[];
  /** 加载的插件 */
  private plugin: Array<any> = [];
  constructor(oicqConfig: any, botConfig: any) {
    this.oicqConfig = oicqConfig;
    this.qq = botConfig.account;
    this.admin = new Set<number>(botConfig.admin);
    this.pluginList = botConfig.pluginList;
    if (this.oicqConfig[botConfig.account] != undefined)
      this.oicqConfig.general = Object.assign(
        this.oicqConfig.general,
        this.oicqConfig[botConfig.account]
      );
    this.oicq = createClient(this.qq, this.oicqConfig.general);
    //加载插件
    loadPlugin(this.qq, this.plugin, this.pluginList);

    //登录
    this.oicq
      .on("system.login.qrcode", function (e) {
        //扫码后按回车登录
        process.stdin.once("data", () => {
          this.login();
        });
      })
      .login();

    //登录成功
    this.oicq.on("system.online", () => {
      console.log(this.qq + ":已经登录!");
    });
    this.oicq.on("message", (e: MessageEvent) => {
      console.log(e);
    });
  }
  getOicq() {
    return this.oicq;
  }
}
