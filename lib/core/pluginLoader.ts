import { fs } from "fs";
import path = require("path");
var pluginPath = path.join(__dirname, "plugin");
export function loadPlugin(plugin: any, pluginList: string[]) {
  //如果为ALL则加载plugin下除plugin.js的全部js文件
  if (pluginList[0] == "ALL") {
  }
}
