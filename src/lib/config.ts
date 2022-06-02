/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\config.ts
 * @Description:
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
export type Config = {
    // 日志出现错误时发送给管理员
    error_call_admin: boolean;
    // 是否将日志输出到文件
    save_log_file: boolean;
    // 管理员列表
    admin: number[];
    // 插件列表
    plugins: string[];
};
