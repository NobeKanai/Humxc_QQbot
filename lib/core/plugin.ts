/** 插件类，消息进入这里处理 */
export class Plugin {
  pluginClass: Array<any> = [];
  constructor() {}
  getPluginClass() {
    return this.pluginClass;
  }
}
