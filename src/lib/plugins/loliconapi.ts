/**
 * 对api.lolicon.app的实现
 * https://api.lolicon.app/#/setu
 */
import https from "https";
import { segment } from "oicq";
import { BotShell } from "../bot";
import { groupCommandMatcherFromRegex, groupCommandMatcherFromText } from "../command";
import { safeImageStream, sleep } from "../utils";

/** 请求 Api 发送的信息 */
type ReqData = {
    r18?: 0 | 1; // 0为非 R18，1为 R18，2为混合（在库中的分类，不等同于作品本身的 R18 标识）
    num?: number; // 一次返回的结果数量，范围为1到100；在指定关键字或标签的情况下，结果数量可能会不足指定的数量
    uid?: number[]; // 返回指定uid作者的作品，最多20个
    keyword?: string; // 返回从标题、作者、标签中按指定关键字模糊匹配的结果，大小写不敏感，性能和准度较差且功能单一，建议使用tag代替
    tag?: string[]; // 返回匹配指定标签的作品，详见下文
    size?: { [index: number]: "original" | "regular" | "small" | "thumb" | "mini" }; // 返回指定图片规格的地址，详见下文
    proxy: string; //  设置图片地址所使用的在线反代服务，无vpn用 i.pixiv.re，有vpn用 i.pixiv.cat
    dateAfter?: number; // 返回在这个时间及以后上传的作品；时间戳，单位为毫秒
    dateBefore?: number; // 返回在这个时间及以前上传的作品；时间戳，单位为毫秒
    dsc?: boolean; // 设置为任意真值以禁用对某些缩写keyword和tag的自动转换，详见下文
};

/** 色图对象 */
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

export async function loliconAPI(sh: BotShell): Promise<void> {
    sh.registerGroupCommand(groupCommandMatcherFromRegex(/^loli(con)?(api)? 可用性$/i), async (e) => {
        await e.reply("接口近10分钟可用性: " + (await howLolicon()));
    });

    sh.initializePermissions("来点色图");
    sh.registerGroupCommand(groupCommandMatcherFromRegex("来点(\\S+)(涩|色|瑟)图"), async (e) => {
        sh.checkPermission(e, "来点色图");

        const tags = e.raw_message.slice(2, -2).split(",");

        let setu: Setu[] = [];
        try {
            setu = await getSetu(
                {
                    proxy: "i.pximg.net",
                    tag: tags,
                    size: ["regular"],
                },
                1000,
            );
        } catch (err) {
            sh.logger.error(err);
            await e.reply("获取失败");
            return;
        }

        if (setu.length === 0) {
            await e.reply("没有找到你想要的涩图");
            return;
        }

        sh.logger.debug(setu);

        try {
            await e.reply(
                segment.image(
                    await safeImageStream(setu[0].urls.regular!, { headers: { "referer": "https://www.pixiv.net/" } }),
                ),
            );
            return;
        } catch (err) {
            sh.logger.error("when sending image", err);
            await e.reply("发送失败");
        }
    });
}

/** 获取色图 */
async function getSetu(reqData: ReqData, timeout: number = 30000): Promise<Setu[]> {
    let setus: Setu[];
    try {
        let resp: { error: string; data: Setu[] } = await doPost(
            `api.lolicon.app`,
            `/setu/v2`,
            JSON.stringify(reqData),
            timeout,
        );
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
function doPost(host: string, path: string, data: string, timeout: number = 30000): any {
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
            timeout: timeout,
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
        req.on("timeout", () => {
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

/** 获取接口近10分钟可用性 */
function howLolicon(): Promise<number> {
    return new Promise((resolve, reject) => {
        let contentType: string | undefined;
        let nowDate = new Date();
        let endTime = nowDate.getTime().toString().substring(0, 10);
        let startTime = new Date(nowDate.getTime() - 3600000).getTime().toString().substring(0, 10);
        const options: https.RequestOptions = {
            host: `api.lolicon.app`,
            path:
                `/librato-metrics-api/v1/sdk_charts/25965898/streams/69555512?start_time=${startTime}&end_time=${endTime}&resolution=1&sources%5B%5D=`,
            method: "GET",
            headers: {
                authorization:
                    `Basic YXBwMjE1Njk4NTE4QGhlcm9rdS5jb206ZTNmZTk4NDI3Njk5OGRlMWUzODhiMGVmODFjYmQ1YzkyY2ZlZTgyYTFmYjEzMDU2ODQxMDViN2Y0ZmE1ZWU5OQ==`,
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

                    let resp = jsonData.slice(jsonData.length - 10, jsonData.length);
                    let sum = 0;
                    for (let i = 0; i < resp.length; i++) {
                        sum += resp[i].value;
                    }
                    sum /= 10;
                    resolve(1 - sum);
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
