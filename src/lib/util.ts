/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-03
 * @FilePath: \QQbot\src\lib\util.ts
 * @Description: 提供比较通用的工具函数
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import fs from "fs";
import path from "path";

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

/**
 * @description: 验证 chile 是否继承于 father，即验证 child 包含于 father，对于比较复杂的对象应当适当传入 deep 参数。
 * @param {any} child - 验证的子类
 * @param {any} father - 验证的父类
 * @param {number} deep - 递归验证的深度，默认为 -1，递归到最深处。
 * @return {*} 如果 child 继承自 father，则返回 void，如果之间不满足继承关系，将抛出错误。
 */
export function verifyExtends(child: any, father: any, deep: number = -1): void {
    if (deep === 0) {
        return;
    }
    if (typeof child != "object") return;
    for (const key in father) {
        if (Object.prototype.hasOwnProperty.call(father, key)) {
            if (Object.prototype.hasOwnProperty.call(child, key)) {
                let f = getValue(father, key);
                let c = getValue(child, key);

                let fType = typeof f;
                let cType = typeof c;

                if (typeof f !== "object" && typeof c !== "object" && fType !== cType) {
                    throw new Error(`The key '${key}' want type '${fType}' but '${cType}'`);
                }
                verifyExtends(c, f, --deep);
            } else throw new Error(`The key '${key}' is not exist in '${JSON.stringify(child)}'`);
        }
    }
}

/**
 * @description: 安全地从 obj 中获取 key 的值。
 * @param {T} obj - 需要获取值的对象
 * @param {K} key - 键的名称
 * @return {T[K]} 获取到的值
 */
export function getValue<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

/**
 * @description: 序列化一个对象，并保存到磁盘。需要捕获错误。
 * @param {string} filePath - 文件的完整路径
 * @param {any} data - 需要被序列化的对象，在此函数内部使用 JSON.stringify 处理。
 */
export function mkJsonFile(filePath: string, data: any): void {
    try {
        mkDirsSync(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (error) {
        throw error;
    }
}

/**
 * @description: 递归创建文件夹。需要捕获错误。
 * @param {string} DirName - 文件夹名称
 * @return {boolean} 返回文件夹是否存在，此返回值在此函数内部使用。用户调用时总是返回 true。
 */
export function mkDirsSync(DirName: string): boolean {
    if (fs.existsSync(DirName)) {
        return true;
    } else if (mkDirsSync(path.dirname(DirName))) {
        fs.mkdirSync(DirName);
    }
    return false;
}
