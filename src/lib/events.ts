/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-03
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-03
 * @FilePath: \QQbot\src\lib\events.ts
 * @Description: 提供事件
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import { GroupMessageEvent, PrivateMessageEvent } from "oicq";

/** 事件地图 */
export interface EventMap<T = any> {
    /** 新的一天 */
    newday: (this: T, event: null) => void;
    /** 来自管理员的消息 */
    "admin.message": (this: T, event: { message: PrivateMessageEvent | GroupMessageEvent }) => void;
    /** 来自管理员的群聊消息 */
    "admin.message.group": (this: T, event: { message: GroupMessageEvent }) => void;
    /** 来自管理员的私聊消息 */
    "admin.message.private": (this: T, event: { message: PrivateMessageEvent }) => void;
}
