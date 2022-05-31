import FormData from "form-data";
import { load } from "cheerio";
import { BotPlugin, BotPluginConfig, BotPluginProfile, BotPluginUser } from "../lib/plugin";
import { segment, Sendable } from "oicq";
type Image = {
    // 标题
    Title: string;
    // 相似度
    Similarity: number;
    // 预览图
    Img: string;
    // 来源链接
    Src: string;
};
type SearchResult = {
    UseTime: number;
    Result: Image[];
};
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "SearchImg";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "搜索图片";
}
export class PluginConfig implements BotPluginConfig {
    Users: BotPluginUser[] = [];
}
export class Plugin extends BotPlugin<PluginConfig> {
    public allImage: Map<number, string> = new Map<number, string>();
    public init() {
        setInterval(() => {
            this.allImage.clear();
        }, 180000);
        this.client.on("message", (m) => {
            for (let i = 0; i < m.message.length; i++) {
                const msg = m.message[i];
                if (msg.type === "image") {
                    if (msg.url === undefined) return;
                    this.allImage.set(m.rand, msg.url);
                    return;
                }
            }
        });
        this.regKeyword("搜图", "global", "allow_all", async (message) => {
            if (message.source === undefined) return;
            let url = this.allImage.get(message.source.rand);
            if (url === undefined) {
                message.reply("没有在聊天中找到图片\n尝试重发图片\n每半小时清除一次记录");
                return;
            }
            let respMsg: Sendable = [];
            try {
                let searchResult: SearchResult = await SearchImg(url);
                respMsg[0] = `搜索耗时: ${searchResult.UseTime}ms\n`;
                let result = searchResult.Result;
                respMsg[0] += `有 ${result.length} 条结果\n`;
                if (result.length > 0) {
                    let infoMsg = "";
                    respMsg.push(segment.image(result[0].Img, true, 30));
                    if (result[0].Title !== "") infoMsg += `\n标题: ${result[0].Title}`;
                    if (result[0].Similarity !== 0) infoMsg += `\n相似度: ${result[0].Similarity}%`;
                    if (result[0].Src !== "") infoMsg += `\n链接: ${result[0].Src}`;

                    respMsg.push(infoMsg);
                }
            } catch (error) {
                respMsg = (error as Error).message;
            }
            message.reply(respMsg).catch((e) => {
                this.logger.error(e);
            });
        });
    }
}

function SearchImg(url: string): Promise<SearchResult> {
    let form: FormData = new FormData();
    let options: FormData.SubmitOptions = {
        host: "saucenao.com",
        path: "/search.php",
        protocol: "https:",
    };
    return new Promise<SearchResult>((resolve, reject) => {
        let sTime = new Date().getTime();
        let result: SearchResult = {
            UseTime: 0,
            Result: [],
        };
        form.append("url", url);
        form.submit(options, (err, resp) => {
            if (err !== null) {
                reject(err);
                return;
            }
            let data = "";
            resp.on("data", (d) => {
                data += d;
            });
            resp.on("end", () => {
                const $ = load(data);
                let resulttables = $(
                    ".result:not(.hidden):not(#result-hidden-notification)>.resulttable>tbody>tr"
                );
                let imgs: Image[] = [];
                for (let i = 0; i < resulttables.length; i++) {
                    const resulttable = $(resulttables[i]);
                    // 缩略图
                    let img = resulttable.find(".resultimage>a>img").attr("src");
                    let similarity = resulttable
                        .find(".resulttablecontent>.resultmatchinfo>.resultsimilarityinfo")
                        .text();
                    let title = resulttable.find(".resulttitle>a").text();
                    let src = $(resulttable.find(".resultcontent>.resultcontentcolumn>a")[0]).attr(
                        "href"
                    );
                    // 空检查
                    if (img === undefined) img = "";
                    if (similarity === undefined) similarity = "";
                    if (title === undefined) title = "";
                    if (src === undefined) src = "";
                    imgs.push({
                        Img: img,
                        Title: title,
                        Src: src,
                        Similarity: Number.parseFloat(similarity),
                    });
                }
                let eTime = new Date().getTime();
                result.UseTime = eTime - sTime;
                result.Result = imgs;
                resolve(result);
            });
        });
    });
}
