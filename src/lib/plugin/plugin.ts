/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\plugin\plugin.ts
 * @Description:插件类，所有插件应当继承此类。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
export interface PluginProfile {
    // 插件名称
    Name: string;
    // 机器人客户端版本
    BotVersion: string;
    // 插件版本
    PluginVersion: string;
    // 描述信息
    Info: string;
}
export class Plugin {
    constructor(profile: PluginProfile) {}
}
