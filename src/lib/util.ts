/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-02
 * @FilePath: \QQbot\src\lib\util.ts
 * @Description: 提供比较通用的工具方法
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
/**
 * @description: 休眠一段时间，在休眠结束后返回，一般用于 await
 * @param {number} timeout - 休眠的时间，单位毫秒(ms)
 */
export function sleep(timeout: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}
/**
 * @description: 从控制台获取输入
 * @return {string} 输入的字符串，已去除尾部换行
 */
export function getStdInput(): Promise<string> {
    return new Promise<string>((resolve) => {
        process.stdin.once("data", (buf) => {
            // buf.slice(0, buf.length - 2) 去除尾部换行符
            resolve(buf.slice(0, buf.length - 2).toString());
        });
    });
}
