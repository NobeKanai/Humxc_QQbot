import { BotClient } from "./client";

export class Session {
  readonly area: string;
  private plugins: Map<string, any> = new Map();
  readonly id: string;
  constructor(
    client: BotClient,
    sessionID: string,
    _area: string,
    pluginList: any
  ) {
    this.id = sessionID;
    this.area = _area;
    for (const key in pluginList) {
      if (Object.prototype.hasOwnProperty.call(pluginList, key)) {
        let plugin = pluginList[key];

        this.plugins.set(key, new plugin(client));
      }
    }
    for (let i = 0; i < pluginList.length; i++) {
      const plugin = pluginList[i];
    }
  }
  event(eventName: string, data: any, pluginName: string) {
    let p = this.plugins.get(pluginName);
    p.event(eventName, data);
  }
  keyWord(keyWord: string, data: any, pluginName: string) {
    let p = this.plugins.get(pluginName);
    p.keyword(keyWord, data);
  }
}
