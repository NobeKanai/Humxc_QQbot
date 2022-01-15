const fs = require("fs");
import path = require("path");
var pluginPath = path.join(process.cwd(), "plugin");
export function loadPlugin(
  qq: number,
  plugin: Array<any>,
  pluginList: string[]
) {
  //如果为ALL则加载plugin下除plugin.js的全部js文件
  if (pluginList[0] == "ALL") {
    //查找目录下的js文件
    let isFile = (fileName: string) => {
      return (
        path.basename(fileName) != "plugin.js" &&
        fs.lstatSync(fileName).isFile() &&
        path.extname(fileName) == ".js"
      );
    };
    let list = fs
      .readdirSync(pluginPath)
      .map((fileName: string) => {
        return path.join(pluginPath, fileName);
      })
      .filter(isFile);
    loadFile(list);
  } else {
    //加载指定列表的文件
    let list: Array<string> = [];
    pluginList.forEach((fileName) => {
      list.push(path.join(pluginPath, fileName));
    });
    loadFile(list);
  }
  function loadFile(list: Array<string>) {
    list.forEach((file: string) => {
      console.log(qq + " - 正在加载[" + path.basename(file) + "]");
      let p;
      try {
        p = require(file);
      } catch (error) {
        console.log(
          qq + " - 加载[" + path.basename(file) + "]时出错，已跳过该插件"
        );
        console.log(error);
      }
      for (let key in p) {
        plugin.push(p[key]);
      }
    });
  }

  console.log(qq + " - 插件加载完毕!");
}
export function parsePlugin() {}
