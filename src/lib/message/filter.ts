/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-03
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-06-04
 * @FilePath: \QQbot\src\lib\message\filter.ts
 * @Description: 此文件提供预定义的消息过滤器
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import { PrivateMessage, GroupMessage, DiscussMessage } from "oicq";
import { Client } from "../client";

/**
 * @description: 消息过滤器函数
 * @return {boolean} 过滤结果
 */
export type MsgFilter = (message: PrivateMessage | GroupMessage | DiscussMessage) => boolean;

/**
 * @description: 预定义的消息过滤器
 */
export type MsgFilterPre =
    | "allow_all"
    | "bot_admin"
    | "group_owner"
    | "group_admin"
    | "group_member"
    | "atme"
    | "friend";

/** 获取预定义的过滤器 */
export function getMsgFilter(
    filterName: "allow_all" | "atme" | "group_owner" | "group_admin" | "group_member"
): MsgFilter;
export function getMsgFilter(filterName: "bot_admin" | "friend"): (client: Client) => MsgFilter;
export function getMsgFilter(
    filterName: MsgFilterPre
): ((client: Client) => MsgFilter) | MsgFilter {
    switch (filterName) {
        case "allow_all":
            return (message: PrivateMessage | GroupMessage | DiscussMessage) => {
                return true;
            };

        case "bot_admin":
            return function (client: Client) {
                return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                    return client.isAdmin(message.sender.user_id);
                };
            };

        case "atme":
            return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                if (
                    (message.message_type == "group" || message.message_type == "discuss") &&
                    message.atme
                ) {
                    return true;
                }
                return false;
            };

        case "group_owner":
            return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                if (message.message_type == "group") {
                    return message.sender.role == "owner";
                } else return false;
            };

        case "group_admin":
            return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                if (message.message_type == "group") {
                    return message.sender.role == "admin" || message.sender.role == "owner";
                } else return false;
            };

        case "group_member":
            return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                if (message.message_type == "group") {
                    return (
                        message.sender.role == "member" ||
                        message.sender.role == "admin" ||
                        message.sender.role == "owner"
                    );
                } else return false;
            };

        case "friend":
            return function (client: Client): MsgFilter {
                return function (message: PrivateMessage | GroupMessage | DiscussMessage) {
                    if (client.isFriend(message.sender.user_id)) {
                        return true;
                    }
                    return false;
                };
            };

        default:
            throw new Error(`不存在的触发器类型: '${filterName}', 请检查。`);
    }
}
