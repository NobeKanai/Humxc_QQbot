import { createClient, Client, MessageEvent } from "oicq";
import { loadPlugin } from "./pluginLoader";
import { Plugin } from "./plugin";
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
  /** 加载的插件类 */
  private pluginClass: Array<any> = [];
  private pluginObject: Array<any> = [];
  /** 事件列表 */
  private _event: Map<string, Array<any>> = new Map();
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
    loadPlugin(this.qq, this.pluginClass, this.pluginList);
    //解析插件
    this.pluginClass.forEach((cla) => {
      this.pluginObject.push(new cla(this));
    });
    this.pluginObject.forEach((pluginObj) => {
      switch (pluginObj.area) {
        //加载GLOBAL插件
        case "GLOBAL":
          // for (let index = 0; index < pluginObj.config.length; index++) {
          //   switch (pluginObj.config[index].trigger) {
          //     //添加EVEVNT
          //     case "EVENT":
          //       this._event.set(
          //         pluginObj.config[index]._event,
          //         pluginObj.config[index].run
          //       );
          //       break;

          //     default:
          //       break;
          //   }
          // }
          pluginObj.config.forEach(
            (config: {
              trigger: string;
              _event: Array<string>;
              run: Function;
            }) => {
              switch (config.trigger) {
                //添加EVEVNT
                case "EVENT":
                  config._event.forEach((eventName) => {
                    if (!this._event.has(eventName)) {
                      this._event.set(eventName, new Array<any>());
                    }
                    this._event.get(eventName)?.push(pluginObj);
                  });

                  break;

                default:
                  break;
              }
            }
          );
          break;

        default:
          break;
      }
    });
    //设置事件

    this._event.forEach((value, key) => {
      console.log(key);
      this.oicq.on(key, (e) =>
        value.forEach((obj) => obj.eventTrigger(key, e))
      );
    });

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
  }

  getOicq() {
    return this.oicq;
  }
}
