import { createClient, Client, MessageEvent, Config } from "oicq";
import { loadPlugin } from "./pluginLoader";
import { Session } from "./session";
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
  public pluginList: string[] | undefined;
  /** 加载的插件 */
  private Plugins: any = {
    global: {},
    group: {},
    private: {},
  };
  /** 会话列表 */
  private sessions: any = {
    global: new Map(),
    group: new Map(),
    private: new Map(),
  };
  constructor(uin: number, conf?: BotConfig) {
    super(uin, conf);
    this.admin = conf?.admin;
    this.password = conf?.password;
    this.pluginList = conf?.pluginList;
    this.Plugins = loadPlugin(this);
    this.sessions.global.set(
      "global",
      new Session(this, "global", "GLOBAL", this.Plugins.global)
    );
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

  getSession(sessionArea: string, sesssionID: string) {
    if (this.sessions[sessionArea].has(sesssionID)) {
      return this.sessions[sessionArea].get("global");
    } else {
      this.logger.error(`没有找到会话`);
    }
  }
  registeEvent(event: string, path: string) {
    this.logger.debug(`${path}已监听事件${event}`);
    this.on(event, (data: any) => {
      this.triggerEvent(event, data, path);
    });
  }
  triggerEvent(event: string, data: any, _path: string) {
    let path = _path.split(".");
    this.logger.debug(`${_path}触发了事件${event}`);
    this.getSession(path[0], "global").event(event, data, path[1]);
  }
  //** 机器人登录 */
  botLogin() {
    //密码登录
    if (this.password != "" || this.password != undefined) {
      this.login(this.password);
    } else {
      //验证码登录
      this.on("system.login.qrcode", function (e) {
        //扫码后按回车登录
        process.stdin.once("data", () => {
          this.login();
        });
      }).login();
    }
  }
}
/** 创建一个客户端 (=new Client) */
export function createBot(uin: number, config?: BotConfig) {
  if (isNaN(Number(uin))) throw new Error(uin + " is not an OICQ account");
  return new BotClient(Number(uin), config);
}
