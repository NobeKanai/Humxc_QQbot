/**
 * 对api.lolicon.app的实现
 * https://api.lolicon.app/#/setu
 */
import https from "https";
import {
    PrivateMessageEvent,
    GroupMessageEvent,
    DiscussMessageEvent,
    segment,
    MessageRet,
    Quotable,
} from "oicq";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig } from "../lib/plugin";
import { getConfig } from "../lib/pluginFather";
import { EventEmitter } from "events";

class ReqData {
    r18: number = 0; // 0为非 R18，1为 R18，2为混合（在库中的分类，不等同于作品本身的 R18 标识）
    num: number = 1; // 一次返回的结果数量，范围为1到100；在指定关键字或标签的情况下，结果数量可能会不足指定的数量
    uid: number[] = []; // 返回指定uid作者的作品，最多20个
    keyword: string = ""; // 返回从标题、作者、标签中按指定关键字模糊匹配的结果，大小写不敏感，性能和准度较差且功能单一，建议使用tag代替
    tag: string[] = []; // 返回匹配指定标签的作品，详见下文
    size: string[] = ["original", "regular"]; // 返回指定图片规格的地址，详见下文
    proxy: string = `i.pixiv.re`; // 设置图片地址所使用的在线反代服务，详见下文
    dateAfter?: number; // 返回在这个时间及以后上传的作品；时间戳，单位为毫秒
    dateBefore?: number; // 返回在这个时间及以前上传的作品；时间戳，单位为毫秒
    dsc: boolean = false; // 设置为任意真值以禁用对某些缩写keyword和tag的自动转换，详见下文
}
type Setu = {
    pid: number; // 作品 pid
    p: number; // 作品所在页
    uid: number; // 作者 uid
    title: string; // 作品标题
    author: string; // 作者名（入库时，并过滤掉 @ 及其后内容）
    r18: boolean; // 是否 R18（在库中的分类，不等同于作品本身的 R18 标识）
    width: number; // 原图宽度 px
    height: number; // 原图高度 px
    tags: string[]; // 作品标签，包含标签的中文翻译（有的话）
    ext: string; // 图片扩展名
    uploadDate: number; // 作品上传日期；时间戳，单位为毫秒
    urls: {
        original?: string;
        regular?: string;
        small?: string;
        thumb?: string;
        mini?: string;
    }; // 包含了所有指定size的图片地址
};
interface DefaultConfigItface {
    users: {
        qq: number;
        isGroup: boolean;
        r18: boolean;
    }[];
}
class DefaultConfig implements DefaultConfigItface {
    users: { qq: number; isGroup: boolean; r18: boolean }[] = [];
}

export class PluginConfig implements BotPluginConfig {
    PluginName: string = "Lolicon.API";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "提供随机色图!";
}
export class Plugin extends BotPlugin {
    private eventer = new EventEmitter();
    private sendedSetu: { messageRet: MessageRet; setu: Setu }[] = [];
    private clearSendedSetu: NodeJS.Timeout | undefined;
    private setuReqList: {
        message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent;
        req: ReqData;
    }[] = [];
    private isGetingSetu: boolean = false;
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, new DefaultConfig());
        this.bot.regKeyword("^来点.*色图$", (message) => {
            let user: { qq: number; isGroup: boolean; r18: boolean } | null = null;
            switch (message.message_type) {
                case "group":
                    user = this.getUser(message.group_id, true);
                    break;

                case "private":
                    user = this.getUser(message.sender.user_id, false);
                    break;
                default:
                    return;
            }

            if (user === null) return;
            let tag = message.raw_message.replace(/来点|色图/g, "").split(/,+| +|，+/g);
            let req = new ReqData();
            req.tag = tag;
            req.r18 = user?.r18 == true && user?.r18 != undefined ? 2 : 0;
            this.setuReqList.push({
                message: message,
                req: req,
            });
            this.eventer.emit("start");
        });
        this.bot.regKeyword("^lolicon可用性$", async (message) => {
            try {
                let resp: any = await howLolicon();
                message
                    .reply(
                        `Lolicon API\n可用性: ${((1 - resp.value) * 100)
                            .toString()
                            .substring(0, 5)}%\n时间: ${fomartTime(
                            new Date(Number.parseInt(resp.measure_time + "000"))
                        )}`
                    )
                    .catch((err) => {
                        this.logger.error(err);
                    });
            } catch (error) {
                this.logger.warn(error);
                let err: any = error;
                message.reply(err.message + "错误(；′⌒`)").catch((err) => {
                    this.logger.error(err);
                });
            }
        });
        this.bot.regKeyword("获取信息$", (message) => {
            if (message.source != undefined) {
                let setu = this.getSendedSetu(message.source);
                if (setu == null) {
                    message.reply("没有找到", true);
                } else {
                    message.reply(
                        `${setu.title}\n- 作者: ${setu.author}\n- uid: ${setu.uid}\n- 标签: ${setu.tags}\n- 链接: https://www.pixiv.net/artworks/${setu.pid}\n- 原图: ${setu.urls.original}`,
                        true
                    );
                }
            }
        });
        this.eventer.on("start", async () => {
            if (this.isGetingSetu) return;
            this.isGetingSetu = true;
            while (true) {
                let setuReq = this.setuReqList.shift();
                let setus: Setu[] = [];
                if (setuReq != undefined) {
                    try {
                        setus = await getSetu(setuReq.req);
                    } catch (error) {
                        this.logger.warn(error);
                        let err: any = error;
                        setuReq.message.reply(err.message + "错误(；′⌒`)").catch((err) => {
                            this.logger.error(err);
                        });
                        continue;
                    }
                    if (setus.length === 0) {
                        await setuReq.message.reply("没找到你想要的色图哦(●'◡'●)").catch((err) => {
                            this.logger.error(err);
                        });
                    } else {
                        for (let i = 0; i < setus.length; i++) {
                            const setu: Setu = setus[i];

                            if (setu.urls.regular != undefined) {
                                let img = segment.image(setu.urls.regular);
                                setuReq?.message
                                    .reply(img)
                                    .catch((err) => {
                                        this.logger.error(err);
                                    })
                                    .then((value: void | MessageRet) => {
                                        if (value != null) {
                                            this.addSendedSetu(value, setu);
                                        }
                                    });
                            }
                        }
                    }
                }
                if (this.setuReqList.length === 0) break;
            }
            this.isGetingSetu = false;
        });
    }

    /** 获取用户 */
    getUser(uid: number, isGroup: boolean): { qq: number; isGroup: boolean; r18: boolean } | null {
        for (let i = 0; i < this.config.users.length; i++) {
            const user: { qq: number; isGroup: boolean; r18: boolean } = this.config.users[i];
            if (user.qq === uid && user.isGroup === isGroup) {
                return user;
            }
        }
        return null;
    }
    addSendedSetu(messageRet: MessageRet, setu: Setu) {
        this.sendedSetu.push({ messageRet: messageRet, setu: setu });
        if (this.clearSendedSetu === undefined) {
            this.clearSendedSetu = setTimeout(() => {
                this.sendedSetu = [];
            }, 600000);
        } else {
            this.clearSendedSetu.refresh();
        }
    }
    getSendedSetu(messsageSource: Quotable): Setu | null {
        for (let i = 0; i < this.sendedSetu.length; i++) {
            const sendedSetu: { messageRet: MessageRet; setu: Setu } = this.sendedSetu[i];
            if (
                messsageSource.rand == sendedSetu.messageRet.rand &&
                messsageSource.seq == sendedSetu.messageRet.seq &&
                Math.abs(messsageSource.time - sendedSetu.messageRet.time) < 10 &&
                messsageSource.user_id == this.bot.uin
            ) {
                return sendedSetu.setu;
            }
        }
        return null;
    }
}
/** 获取色图 */
async function getSetu(reqData: ReqData): Promise<Setu[] | any> {
    let setus: Setu[];
    try {
        let resp: any = await doPose(`api.lolicon.app`, `/setu/v2`, JSON.stringify(reqData));
        if (resp.error === "") {
            setus = resp.data;
            return setus;
        } else {
            throw new Error(resp.error);
        }
    } catch (error) {
        throw error;
    }
}
/** 发送post请求 */
function doPose(host: string, path: string, data: string, timeout: number = 0): any {
    return new Promise((resolve, reject) => {
        let contentType: string | undefined;
        const options: https.RequestOptions = {
            host: host,
            path: path,
            method: "POST",
            headers: {
                "Content-Length": Buffer.byteLength(data),
                "Content-Type": "application/json",
            },
        };
        var respData: string = "";
        const req = https.request(options, (res) => {
            if (res.statusCode != 200) {
                reject(new Error(res.statusCode?.toString()));
            }
            contentType = res.headers["content-type"];
            res.on("data", (d: Buffer) => {
                respData += d.toString("utf-8");
            });
        });
        if (timeout != 0)
            req.setTimeout(timeout, () => {
                reject(new Error("Timeout"));
            });
        req.once("error", (error) => {
            reject(error);
        });
        req.once("close", () => {
            if (contentType === "application/json; charset=utf-8") {
                try {
                    let jsonData = JSON.parse(respData);
                    resolve(jsonData);
                } catch (error) {
                    console.log(respData);
                    reject(error);
                }
            } else {
                reject(new Error("Resp is not json type"));
            }
        });
        req.write(data);
        req.end();
    });
}

/** 获取接口可用性 */
function howLolicon(): any {
    return new Promise((resolve, reject) => {
        let contentType: string | undefined;
        let nowDate = new Date();
        let endTime = nowDate.getTime().toString().substring(0, 10);
        let startTime = new Date(nowDate.getTime() - 3600000).getTime().toString().substring(0, 10);
        const options: https.RequestOptions = {
            host: `api.lolicon.app`,
            path: `/librato-metrics-api/v1/sdk_charts/25965898/streams/69555512?start_time=${startTime}&end_time=${endTime}&resolution=1&sources%5B%5D=`,
            method: "GET",
            headers: {
                authorization: `Basic YXBwMjE1Njk4NTE4QGhlcm9rdS5jb206ZTNmZTk4NDI3Njk5OGRlMWUzODhiMGVmODFjYmQ1YzkyY2ZlZTgyYTFmYjEzMDU2ODQxMDViN2Y0ZmE1ZWU5OQ==`,
            },
        };
        var respData: string = "";
        const req = https.request(options, (res) => {
            if (res.statusCode != 200) {
                reject(new Error(res.statusCode?.toString()));
            }
            contentType = res.headers["content-type"];
            res.on("data", (d: Buffer) => {
                respData += d.toString("utf-8");
            });
        });
        req.once("error", (error) => {
            reject(error);
        });
        req.once("close", () => {
            if (contentType === "application/json") {
                try {
                    let jsonData = JSON.parse(respData).measurements[0].series;

                    resolve(jsonData[jsonData.length - 1]);
                } catch (error) {
                    console.log(respData);
                    reject(error);
                }
            } else {
                reject(new Error("Resp is not json type"));
            }
        });
        req.end();
    });
}
/** 获取格式化的时间 */
function fomartTime(date: Date): string {
    let h = date.getHours();
    let m = date.getMinutes();
    //修复时区对时间显示的影响
    var timezone = -date.getTimezoneOffset();
    if (timezone != 480) h += timezone / 60;
    return `${h < 10 ? "0" + h : h}:${m < 10 ? "0" + m : m}`;
}
