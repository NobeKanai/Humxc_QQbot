import fs from "fs";
import path = require("path");
var pluginPath = path.join(__dirname, "plugin");
export function loadPlugin(plugin: Array<any>, pluginList: string[]) {
  //如果为ALL则加载plugin下除plugin.js的全部js文件
  if (pluginList[0] == "ALL") {
    //查找目录下的js文件
    let isFile = (fileName: string) => {
      return fs.lstatSync(fileName).isFile() && fileName.slice(-3) == ".js";
    };
    let list = fs
      .readdirSync(pluginPath)
      .map((fileName: string) => {
        return path.join(pluginPath, fileName);
      })
      .filter(isFile);

    list.forEach((path: string) => {
      let p = require(path);
      for (let key in p) {
        plugin.push(p[key]);
      }
    });
  }
}
