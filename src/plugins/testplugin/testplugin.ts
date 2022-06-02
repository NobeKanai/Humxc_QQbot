/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\plugins\testplugin.ts
 * @Description: 测试用的插件，这里的内容随时可能改变
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import { BotPlugin, BotPluginProfile } from "../../lib/index";
export class Profile implements BotPluginProfile {
    Name: string = "testPlugin";
    BotVersion: string = "0.0.1";
    PluginVersion: string = "0.0.1";
    Info: string = "测试用的插件";
}

export class Plugin extends BotPlugin {
    public init() {
        this.logger.error("测试错误", "啊对对对", new Error("error"));
    }
}
