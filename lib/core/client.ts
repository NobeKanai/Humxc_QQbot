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
  //关键词存储
  keywords: Map<string, string> = new Map();
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
    this.sessions.group.set(
      "group",
      new Session(this, "group", "GROUP", this.Plugins.group)
    );
    this.sessions.private.set(
      "private",
      new Session(this, "private", "PRIVATE", this.Plugins.private)
    );
    this.KeywordListenr();
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

  getSession(sessionArea: string, sessionID: string) {
    if (this.sessions[sessionArea].has(sessionID)) {
      return this.sessions[sessionArea].get(sessionID);
    } else {
      this.logger.error(`没有找到会话`);
    }
  }
  registeEvent(event: string, path: string) {
    this.on(event, (data: any) => {
      this.triggerEvent(event, data, path);
    });
  }

  triggerEvent(event: string, data: any, _path: string) {
    this.logger.debug(`${_path}触发了事件${event}`);
    let path = _path.split(".");
    let sessionID = path[0];
    switch (path[0]) {
      case "global":
        break;
      case "group":
        if (data.group_id != undefined) {
          sessionID = data.group_id;
          if (!this.sessions.group.has(sessionID)) {
            this.sessions.group.set(
              sessionID,
              new Session(this, sessionID, "group", this.Plugins.group)
            );
          }
        }
        break;
      case "private":
        if (data.from_id != undefined) {
          sessionID = data.from_id;
          if (!this.sessions.private.has(sessionID)) {
            this.sessions.private.set(
              sessionID,
              new Session(this, sessionID, "group", this.Plugins.private)
            );
          }
        }
        break;
      default:
        this.logger.error(`触发事件时出现了意想不到的错误`);
        this.logger.error(event);
        this.logger.error(_path);
        this.logger.error(data);
        break;
    }

    this.getSession(path[0], sessionID).event(event, data, path[1]);
  }
  KeywordListenr() {
    this.on("message", (data) => {
      for (const key of this.keywords.keys()) {
        if (data.raw_message.search(new RegExp(key)) != -1) {
          let path: any = this.keywords.get(key)?.split(".");
          this.getSession(path[0], "global").Keyword(key, data, path[1]);
        }
      }
    });
  }
  sessionCreater() {
    this.on("message.group", (data) => {});
  }
  registeKeyword(Keyword: string, path: string) {
    this.keywords.set(Keyword, path);
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
