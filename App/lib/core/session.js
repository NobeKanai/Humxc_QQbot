"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
class Session {
    constructor(client, sessionID, _area, pluginList) {
        this.plugins = new Map();
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
    event(eventName, data, pluginName) {
        let p = this.plugins.get(pluginName);
        p.event(eventName, data);
    }
    keyword(keyWord, data, pluginName) {
        let p = this.plugins.get(pluginName);
        p.keyword(keyWord, data);
    }
}
exports.Session = Session;
