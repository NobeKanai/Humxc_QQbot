/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-03
 * @FilePath: \QQbot\src\lib\config.sample.ts
 * @Description:默认的配置示例
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
// 此文件必须名为config.js才能生效哦
export default {
    // 通用配置，包含了 oicq 的配置
    // oicq 配置项: https://github.com/takayama-lily/oicq/blob/main/lib/client.ts#L617
    general: {
        //1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad
        platform: 3,
        log_level: "info",

        // 以下为机器人配置
        // 日志出现错误时发送给管理员
        error_call_admin: true,
        // 是否将日志输出到文件
        save_log_file: false,
    },

    // 每个账号的单独配置(用于覆盖通用配置)
    // 147258369: {
    // },
    这里填QQ号: {
        //管理员账户列表 number[]
        admin: [],
        //插件列表(string[]类型,plugin文件夹内js文件的名称)仅输入"ALL"将加载所有插件，留空则不添加插件
        plugins: ["ALL"],
    },
};
