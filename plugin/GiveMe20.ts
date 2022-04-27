import http from "https";
import path from "path";
import {
    DiscussMessageEvent,
    GroupMessage,
    GroupMessageEvent,
    MessageElem,
    PrivateMessage,
    PrivateMessageEvent,
    segment,
    XmlElem,
} from "oicq";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import { BotClient } from "../lib/core/client";
import { IncomingMessage } from "http";
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "GiveMe20";
    BotVersion: string = "0.0.1";
    PluginVersion: string = "1.0.0";
    Info: string = "抓取give-me-20接口的图片";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
    url: string = "https:// awebside.com";
}
export class Plugin extends BotPlugin<PluginConfig> {
    private data: string[];
    private isUpdating: boolean = false;
    private intervalTimeout: NodeJS.Timeout | undefined;
    constructor(
        botClient: BotClient,
        pluginProfile: BotPluginProfile,
        defaultConfig: PluginConfig
    ) {
        super(botClient, pluginProfile, defaultConfig);
        this.data = this.getJsonData("data", []);
        this.logger.debug("设置任务");
        this.intervalTimeout = setInterval(() => {
            this.startUpdate().catch((err) => {
                this.logger.error(err);
            });
        }, 600000);
        this.client.on("system.online", () => {
            this.logger.debug("刷新任务");
            this.startUpdate().catch((err) => {
                this.logger.error(err);
            });
            this.intervalTimeout!.refresh();
        });

        this.regKeyword(
            "^更新色图$",
            "global",
            (message): boolean => {
                return (
                    this.getKeywordFilter("bot_admin")(message) ||
                    (this.getKeywordFilter("plugin_user")(message) &&
                        this.getKeywordFilter("group_admin")(message))
                );
            },
            async (message) => {
                let msg = "";
                if (this.isUpdating) {
                    msg = "正在更新色图...";
                } else {
                    msg = `更新了 ${await this.startUpdate()} 张色图`;
                }

                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        );
        this.regKeyword("^给我色图$", "global", "plugin_user", async (message) => {
            let imgUrl: string = "";
            try {
                imgUrl = this.config.url + "/" + encodeURI(await this.rendomImg());
            } catch (error) {
                message.reply((error as Error).message).catch((err) => {
                    this.logger.error(err);
                });
                return;
            }
            let img = segment.image(imgUrl, true, 30);
            message.reply(img).catch((err) => {
                this.logger.error(err);
            });
        });
        this.regKeyword(
            "^GiveMe20 开启$",
            "global",
            (message): boolean => {
                return (
                    this.getKeywordFilter("bot_admin")(message) ||
                    this.getKeywordFilter("group_admin")(message)
                );
            },
            (message) => {
                let msg = "";
                switch (message.message_type) {
                    case "group":
                        if (this.hasUser(message.group_id, "Group")) {
                            msg = "成功";
                        } else {
                            let u: BotPluginUser = {
                                uid: message.group_id,
                                type: "Group",
                            };
                            if (this.addUser(u) || this.saveConfig()) {
                                msg = "成功";
                            } else {
                                msg = "失败";
                            }
                        }
                        break;

                    case "private":
                        if (this.hasUser(message.sender.user_id, "Person")) {
                            msg = "成功";
                        } else {
                            let u: BotPluginUser = {
                                uid: message.sender.user_id,
                                type: "Person",
                            };
                            if (this.addUser(u) || this.saveConfig()) {
                                msg = "成功";
                            } else {
                                msg = "失败";
                            }
                        }
                        break;

                    default:
                        return;
                }
                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        );
        this.regKeyword(
            "^GiveMe20 关闭$",
            "global",
            (message): boolean => {
                return (
                    this.getKeywordFilter("bot_admin")(message) ||
                    this.getKeywordFilter("group_admin")(message)
                );
            },
            (message) => {
                let msg = "";
                switch (message.message_type) {
                    case "group":
                        if (!this.hasUser(message.group_id, "Group")) {
                            msg = "成功";
                        } else {
                            if (this.rmUser(message.group_id, "Group") || this.saveConfig()) {
                                msg = "成功";
                            } else {
                                msg = "失败";
                            }
                        }
                        break;

                    case "private":
                        if (!this.hasUser(message.sender.user_id, "Person")) {
                            msg = "成功";
                        } else {
                            if (
                                this.rmUser(message.sender.user_id, "Person") ||
                                this.saveConfig()
                            ) {
                                msg = "成功";
                            } else {
                                msg = "失败";
                            }
                        }
                        break;

                    default:
                        return;
                }
                message.reply(msg).catch((err) => {
                    this.logger.error(err);
                });
            }
        );
    }
    async startUpdate(): Promise<number> {
        if (this.config.Users.length == 0) {
            this.logger.info("当前无用户订阅, 取消更新");
            return 0;
        }
        if (this.isUpdating) {
            this.logger.warn("色图正在更新，已取消本次更新请求");
            return -1;
        }
        this.isUpdating = true;
        var updateNum: number = 0;
        var list = [];
        try {
            list = await this.getUpdate().catch((err) => {
                this.logger.error(err);
            });
        } catch (error) {
            this.logger.warn(error);
            this.isUpdating = false;
            return updateNum;
        }
        if (list.length > 0) {
            var imgList = this.getNewItem(list);
            updateNum = imgList.length;
            this.sendImg(imgList).catch((err) => {
                this.logger.error(err);
                this.isUpdating = false;
            });
        } else this.isUpdating = false;

        return updateNum;
    }
    getUpdate(): Promise<Object | any> {
        return new Promise((resolve, reject) => {
            let _path = "update";
            let r_url = new URL(_path, this.config.url);
            let reqList = http.request(r_url, (res: IncomingMessage) => {
                let data: Object;
                if (res.statusCode != 200) reject(new Error("获取更新失败: " + res.statusCode));
                res.on("data", (d: string) => {
                    // 判断格式决定是否解析
                    if (
                        res.headers["content-type"] != undefined &&
                        res.headers["content-type"].split(";")[0] == "application/json"
                    ) {
                        try {
                            data = JSON.parse(d.toString());
                        } catch (error) {
                            reject(error);
                        }
                    } else reject(new Error('content-type 未定义或不为"json"'));
                });
                res.on("end", () => {
                    resolve(data);
                });
            });
            reqList.on("error", (error: Error) => {
                reject(error);
            });
            reqList.end();
        });
    }
    rendomImg(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let _path = "random";
            let r_url = new URL(_path, this.config.url);
            let reqList = http.request(r_url, (res: IncomingMessage) => {
                if (res.statusCode != 200) reject(new Error("获取随机色图失败: " + res.statusCode));
                res.on("data", (d: number[]) => {
                    resolve(d.toString());
                });
            });
            reqList.on("error", (error: Error) => {
                reject(error);
            });
            reqList.end();
        });
    }
    getNewItem(list: Array<string>) {
        let data = new Set(this.data);
        let imgList = [];
        var imgNumber = 0;
        for (let val of list.values()) {
            val = val.replace("\\", "/");
            // val可能为/R16/img.jpg这样的文件名
            let val_base = path.basename(val);
            if (!data.has(val_base)) {
                imgList.push(val);
                this.logger.debug("检测到有新的图片:", val_base);
                imgNumber++;
            }
        }
        this.logger.info("色图更新成功，共更新" + imgNumber + "张色图");
        return imgList;
    }
    async sendImg(imgNameList: Array<string>) {
        if (imgNameList.length == 0) {
            this.isUpdating = false;
            return;
        }
        // 发送给机器人成功的图片的数量
        let sendSuccessImgMsgNum = 0;
        for (let i = 0; i < imgNameList.length; i++) {
            let imgUrl = this.config.url + "/" + encodeURI(imgNameList[i]);
            let img = segment.image(imgUrl, true, 30);
            // 不采取直接单独发，所有消息全部转发
            // 全部发送给自己
            try {
                await this.client.sendSelfMsg(img);
                // 缓解503错误
                await sleep(200);
            } catch (error) {
                this.logger.error("一张图片接收失败:" + imgNameList[i], error);
                continue;
            }
            this.flagImg(imgNameList[i]);
            this.logger.debug("一张图片接收成功:" + imgNameList[i]);
            sendSuccessImgMsgNum++;
        }

        this.logger.debug(
            `色图接收完毕，有 ${imgNameList.length - sendSuccessImgMsgNum}/${
                imgNameList.length
            } 张色图接收失败`
        );
        await sleep(3000);
        let msgs: PrivateMessage[] | GroupMessage[] = await this.client
            .pickFriend(this.client.uin)
            .getChatHistory(undefined, sendSuccessImgMsgNum);
        // 给消息加上昵称
        msgs.forEach((m) => {
            m.sender.nickname = this.client.nickname;
        });
        // 根据图片数量选择发送策略
        if (sendSuccessImgMsgNum < 4) {
            // 消息少的话直接发送给用户
            let imgs: MessageElem[] = [];
            for (let i = 0; i < imgNameList.length; i++) {
                let imgUrl = this.config.url + "/" + encodeURI(imgNameList[i]);
                let img = segment.image(imgUrl, true, 30);
                imgs.push(img);
            }
            for (const user of this.users.group.values()) {
                for (let i = 0; i < imgs.length; i++) {
                    const e = imgs[i];
                    this.logger.debug(
                        `开始将图片发送到群聊: ${user.uid} [${i + 1}/${imgNameList.length}]`
                    );
                    await this.client
                        .sendGroupMsg(user.uid, e)
                        .catch((err) => this.logger.error("一张图片发送到群聊失败:", err));
                }
            }
            for (const user of this.users.person.values()) {
                for (let i = 0; i < imgs.length; i++) {
                    const e = imgs[i];
                    this.logger.debug(
                        `开始将图片发送到私聊: ${user.uid} [${i + 1}/${imgNameList.length}]`
                    );
                    await this.client
                        .sendPrivateMsg(user.uid, e)
                        .catch((err) => this.logger.error("一张图片发送到私聊失败:", err));
                }
            }
        } else {
            // 制作转发消息
            let allImgMsg: XmlElem;
            try {
                allImgMsg = await this.client.makeForwardMsg(msgs);
            } catch (error) {
                this.logger.error("转发消息制作失败: " + error);
                this.isUpdating = false;
                return;
            }
            // 发送转发消息给用户
            for (const user of this.users.group.values()) {
                this.logger.debug(`开始将图片集合发送到群聊: ${user.uid}`);
                await this.client
                    .sendGroupMsg(user.uid, allImgMsg)
                    .catch((err) => this.logger.error("发送图片集合到群聊失败:", err));
                if (imgNameList.length - sendSuccessImgMsgNum > 0)
                    this.client
                        .sendPrivateMsg(
                            user.uid,
                            `不好！共 ${imgNameList.length} 张图片，有 ${
                                imgNameList.length - sendSuccessImgMsgNum
                            } 张接收失败`
                        )
                        .catch((err) => this.logger.error(err));
            }
            for (const user of this.users.person.values()) {
                this.logger.debug(`开始将图片集合发送到私聊: ${user.uid}`);
                await this.client
                    .sendPrivateMsg(user.uid, allImgMsg)
                    .catch((err) => this.logger.error("发送图片集合到私聊失败:", err));
                if (imgNameList.length - sendSuccessImgMsgNum > 0)
                    this.client
                        .sendPrivateMsg(
                            user.uid,
                            `不好！共 ${imgNameList.length} 张图片，有 ${
                                imgNameList.length - sendSuccessImgMsgNum
                            } 张接收失败`
                        )
                        .catch((err) => this.logger.error(err));
            }
        }
        this.isUpdating = false;
        this.saveJsonData("data", this.data);
    }
    // 标记图片为已发送
    flagImg(str: string) {
        if (str != undefined || str != "") {
            let imgName = path.basename(str);
            this.data.push(imgName);
            this.logger.debug("已添加数据:" + imgName);
        }
    }
}
function sleep(time: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
