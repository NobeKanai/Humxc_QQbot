import http from "https";
import { getConfig, getData, saveData } from "../lib/pluginFather";
import path from "path";
import {
    Forwardable,
    GroupMessage,
    Message,
    MessageElem,
    MessageRet,
    PrivateMessage,
    segment,
    Sendable,
    XmlElem,
} from "oicq";
import { BotPlugin, BotPluginConfig, LoadArea } from "../lib/plugin";
import { BotClient } from "../lib/core/client";
import { IncomingMessage } from "http";
var defaultConfig = {
    url: "https://awebside.com",
    //发送对象
    sendTo: [
        {
            QQ: "发送对象的qq号码",
            IsGroup: "布尔值，如果是群聊则为true否则为false",
        },
    ],
};
export class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    Keyword?: string[] | undefined = ["^更新色图$"];
    PluginName: string = "give-me-20-Client";
    BotVersion: string = "0.0.1";
    PluginVersion: string = "1.0.0";
    Info: string = "抓取give-me-20接口的图片";
    Event: Array<string> = ["system.online"];
}
export class Plugin extends BotPlugin {
    private inTheUpdate: boolean = false;
    private canUpdate: boolean = true;
    private intervalTimeout: NodeJS.Timeout | undefined;
    constructor(bot: BotClient) {
        super(bot, new PluginConfig());
        this.config = getConfig(this, defaultConfig);
        this.data = getData(this, []);
    }
    event(eventName: string, data: any) {
        switch (eventName) {
            case "system.online":
                this.start();
                break;
            default:
                break;
        }
    }
    async keyword(keyword: string, data: any) {
        let sendTo = this.config.sendTo;
        for (let i = 0; i < sendTo.length; i++) {
            const element = sendTo[i];
            if (element.QQ == data.group_id) {
                if (data.sender.role == "owner" || data.sender.role == "admin") {
                    break;
                } else {
                    data.reply("只有管理员才可以色色").catch((e: any) => this.logger.error(e));
                    return;
                }
            }
            if (i == sendTo.length - 1) {
                this.logger.info(`群号 ${data.group_id} 没有权限使用该关键词`);
                return;
            }
        }

        switch (keyword) {
            case "^更新色图$":
                if (this.canUpdate) {
                    this.canUpdate = false;
                    if (this.intervalTimeout != undefined) this.intervalTimeout.refresh();
                    else data.reply("插件未完成初始化").catch((e: any) => this.logger.error(e));
                    setTimeout(() => {
                        this.canUpdate = true;
                    }, 10000);
                    let updateNum = await this.startUpdate();
                    if (updateNum == -1)
                        data.reply("色图正在更新，已取消本次委托").catch((e: any) =>
                            this.logger.error(e)
                        );
                    else
                        data.reply(`更新了 ${updateNum} 张色图`).catch((e: any) =>
                            this.logger.error(e)
                        );
                } else {
                    data.reply("又更新啊，歇一会好不好").catch((e: any) => this.logger.error(e));
                }
                break;

            default:
                break;
        }
    }
    start() {
        this.logger.debug("设置任务");
        if (this.intervalTimeout == undefined) {
            this.intervalTimeout = setInterval(() => {
                this.startUpdate();
            }, 600000);
        } else {
            this.intervalTimeout.refresh();
        }
    }
    async startUpdate(): Promise<number> {
        if (this.inTheUpdate) {
            this.logger.warn("色图正在更新，已取消本次委托");
            return -1;
        }
        this.inTheUpdate = true;
        let updateNum: number = 0;
        try {
            let list = await this.getUpdate();
            let imgList = this.getNewItem(list);
            updateNum = imgList.length;
            this.sendImg(imgList);
        } catch (error) {
            this.logger.error(error);
            this.inTheUpdate = false;
        }

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
                    //判断格式决定是否解析
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
    getNewItem(list: Array<string>) {
        let data = new Set(this.data);
        let imgList = [];
        var imgNumber = 0;
        for (let val of list.values()) {
            val = val.replace("\\", "/");
            //val可能为/R16/img.jpg这样的文件名
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
        let lastMessage_id = "";
        if (imgNameList.length == 0) {
            this.inTheUpdate = false;
            return;
        }
        //发送给机器人成功的图片的数量
        let sendSuccessImgMsgNum = 0;
        for (let i = 0; i < imgNameList.length; i++) {
            let imgUrl = this.config.url + "/" + encodeURI(imgNameList[i]);
            let img = segment.image(imgUrl, true, 30);
            //不采取直接单独发，所有消息全部转发
            //全部发送给自己
            try {
                lastMessage_id = await this.bot.sendSelfMsg(img);
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
        await sleep(10000);
        let msgs: PrivateMessage[] | GroupMessage[] = await this.bot
            .pickFriend(this.bot.uin)
            .getChatHistory(undefined, sendSuccessImgMsgNum);
        //给消息加上昵称
        msgs.forEach((m) => {
            m.sender.nickname = this.bot.nickname;
        });
        //根据图片数量选择发送策略
        if (sendSuccessImgMsgNum < 4) {
            //消息少的话直接发送给用户
            for (let j = 0; j < this.config.sendTo.length; j++) {
                const user = this.config.sendTo[j];
                let imgs: (string | MessageElem)[] = [];
                msgs.forEach((e) => {
                    e.message.forEach((ee) => {
                        imgs.push(ee);
                    });
                });

                if (user.IsGroup) {
                    if (imgs != undefined) {
                        for (let i = 0; i < imgs.length; i++) {
                            const e = imgs[i];
                            this.logger.debug(
                                `开始将图片发送到群聊: ${user.QQ} [${i + 1}/${imgNameList.length}]`
                            );
                            await this.bot.sendGroupMsg(user.QQ, e).catch((err) => {
                                this.logger.error("一张图片发送到群聊失败:", err);
                            });
                        }
                    } else this.logger.error("一张图片发送到群聊失败: msg==undefined");
                } else {
                    if (imgs != undefined) {
                        for (let i = 0; i < imgs.length; i++) {
                            const e = imgs[i];
                            this.logger.debug(
                                `开始将图片发送到私聊: ${user.QQ} [${i + 1}/${imgNameList.length}]`
                            );
                            await this.bot.sendPrivateMsg(user.QQ, e).catch((err) => {
                                this.logger.error("一张图片发送到私聊失败:", err);
                            });
                        }
                    } else this.logger.error("一张图片发送到私聊失败: msg==undefined");
                }
            }
        } else {
            // 制作转发消息
            let allImgMsg: XmlElem;
            try {
                allImgMsg = await this.bot.makeForwardMsg(msgs);
            } catch (error) {
                this.logger.error("转发消息制作失败: " + error);
                this.inTheUpdate = false;
                return;
            }
            //发送转发消息给用户
            if (allImgMsg != undefined)
                for (let i = 0; i < this.config.sendTo.length; i++) {
                    const user = this.config.sendTo[i];
                    if (user.IsGroup) {
                        this.logger.debug(`开始将图片集合发送到群聊: ${user.QQ}`);
                        await this.bot.sendGroupMsg(user.QQ, allImgMsg).catch((err) => {
                            this.logger.error("转发图片集合到群聊失败:", err);
                        });
                        if (imgNameList.length - sendSuccessImgMsgNum > 0)
                            this.bot
                                .sendGroupMsg(
                                    user.QQ,
                                    `不好！共 ${imgNameList.length} 张图片，有 ${
                                        imgNameList.length - sendSuccessImgMsgNum
                                    } 张接收失败`
                                )
                                .catch((err) => {
                                    this.logger.error(err);
                                });
                    } else {
                        this.logger.debug(`开始将图片集合发送到私聊: ${user.QQ} `);
                        await this.bot.sendPrivateMsg(user.QQ, allImgMsg).catch((err) => {
                            this.logger.error("转发图片集合到私聊失败:", err);
                        });
                        if (imgNameList.length - sendSuccessImgMsgNum > 0)
                            this.bot
                                .sendPrivateMsg(
                                    user.QQ,
                                    `不好！共 ${imgNameList.length} 张图片，有 ${
                                        imgNameList.length - sendSuccessImgMsgNum
                                    } 张接收失败`
                                )
                                .catch((err) => {
                                    this.logger.error(err);
                                });
                    }
                }
        }
        this.inTheUpdate = false;
        saveData(this);
    }
    //标记图片为已发送
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