import https from "https";
import { BotClient } from "../lib/core/client";
import { BotPlugin, BotPluginConfig } from "../lib/plugin";
import { getConfig, getData, saveData } from "../lib/pluginFather";
export class PluginConfig implements BotPluginConfig {
    PluginName: string = "PUHelper";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "获取PU口袋校园的活动, 并提醒";
}
export class Plugin extends BotPlugin {
    private hostName!: string;
    private oauth_token!: string;
    private oauth_token_secret!: string;
    private filter_string!: string;
    private remind_used: Remind[] = [];
    private intervalTimeOut: NodeJS.Timeout | undefined = undefined;
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, defalutConfig);
        this.data = getData(this, defaultData);
        this.hostName = this.config.hostName;
        this.oauth_token = this.config.oauth_token;
        this.oauth_token_secret = this.config.oauth_token_secret;
        this.filter_string = this.config.filter_string;
        this.bot.on("system.online", () => {
            this.logger.info("设置任务");
            if (this.intervalTimeOut != undefined) {
                this.intervalTimeOut.refresh();
                this.logger.error("Pu刷新了");
            } else {
                this.updateAcitvity().then(() => {
                    this.setRemind(this.data.reminds);
                });
                this.intervalTimeOut = setInterval(async () => {
                    await sleep(Math.floor(Math.random() * 180000 + 1));
                    if (this.bot.isOnline()) {
                        await this.updateAcitvity();
                        this.setRemind(this.data.reminds);
                    } else this.logger.debug("任务取消，客户端不在线");
                }, 1800000);
            }
        });
    }
    /** 更新活动 */
    async updateAcitvity() {
        var geteedActivityNum = 0;
        var simpleActivitys: SimpleActivity[] = await this.getSimpleActivitys();
        var activitys: Activity[] = [];

        for (let i = 0; i < simpleActivitys.length; i++) {
            let geted: Set<number> = new Set(this.data.geted);
            const simpleActivity: SimpleActivity = simpleActivitys[i];
            let activity: Activity;
            //标记已获取
            if (geted.has(simpleActivity.id)) {
                geteedActivityNum++;
                this.logger.debug(`该活动已被获取过: ${simpleActivity.title}`);
                continue;
            }
            try {
                activity = await this.getActivity(simpleActivity);
            } catch (error) {
                this.logger.error(error);
                continue;
            }
            activitys.push(activity);
            this.data.geted.push(simpleActivity.id);
        }
        this.logger.info(`其中有 ${geteedActivityNum} 条活动已经获取过`);
        if (activitys.length == 0) return;
        activitys = this.filter(activitys, this.filter_string);

        for (let i = 0; i < activitys.length; i++) {
            const activity = activitys[i];
            let nowDate = new Date();
            let regStartTime = new Date(activity.regStartTime);
            let regEndTime = new Date(activity.regEndTime);
            let startTime = new Date(activity.startTime);
            let endTime = new Date(activity.endTime);
            let signInTime = new Date(activity.sign_in_start_time);
            let signOutTime = new Date(activity.sign_out_start_time);

            let regStartTime_f = fomartTime(regStartTime);
            let regEndTime_f = fomartTime(regEndTime);
            let startTime_f = fomartTime(startTime);
            let endTime_f = fomartTime(endTime);
            let signOutTime_f = fomartTime(signOutTime);
            //添加获取到活动的提醒
            let message_get_activity =
                `有活动可以报名 - ${activity.credit}学分\n` +
                `${activity.title}\n` +
                ` - 开始报名: ${regStartTime_f}\n` +
                ` - 报名截止: ${regEndTime_f}\n` +
                ` - 活动开始: ${startTime_f}\n` +
                ` - 活动结束: ${endTime_f}`;
            this.data.reminds.push({ time: 0, message: message_get_activity });
            //添加报名提醒
            let message_reg =
                `有活动现在开始报名\n` +
                `${activity.title}\n` +
                ` - 可参与人数: ${activity.limitNum == -1 ? "不限" : activity.limitNum}\n` +
                ` - 报名截止: ${regEndTime_f}`;
            if (regStartTime.getTime() > nowDate.getTime()) {
                this.data.reminds.push({ time: regStartTime.getTime(), message: message_reg });
            } else if (regEndTime.getTime() > nowDate.getTime()) {
                this.data.reminds.push({ time: 0, message: message_reg });
            }
            //添加签到提醒
            let message_sign_in =
                `有活动现在开始签到\n` + `${activity.title}\n` + ` - 签退时间: ${signOutTime_f}`;
            if (
                signInTime.getTime() < nowDate.getTime() &&
                signOutTime.getTime() > nowDate.getTime()
            ) {
                this.data.reminds.push({ time: 0, message: message_sign_in });
            } else this.data.reminds.push({ time: signInTime.getTime(), message: message_sign_in });

            //添加签退提醒
            let message_sign_out = `有活动现在开始签退\n` + `${activity.title}`;
            if (
                signOutTime.getTime() < nowDate.getTime() &&
                endTime.getTime() > nowDate.getTime()
            ) {
                this.data.reminds.push({ time: 0, message: message_sign_out });
            } else
                this.data.reminds.push({ time: signOutTime.getTime(), message: message_sign_out });
        }
        this.data.reminds.sort((a: Remind, b: Remind) => {
            return a.time - b.time;
        });
        saveData(this);
    }
    setRemind(reminds: Remind[]) {
        var date = new Date();
        var delReminds: Remind[] = [];
        for (let i = 0; i < reminds.length; i++) {
            const remind = reminds[i];
            var timeout = remind.time == 0 ? 0 : remind.time - date.getTime();
            if (timeout < 0) {
                this.logger.info(`提醒已过期，将删除该提醒: \n${remind.message}`);
                delReminds.push(remind);
            }
        }
        for (let i = 0; i < delReminds.length; i++) {
            if (!rmRemind(reminds, delReminds[i])) this.logger.error(new Error("移除remind出错"));
        }
        for (let i = 0; i < reminds.length; i++) {
            const remind = reminds[i];
            let flag = true;
            for (let j = 0; j < this.remind_used.length; j++) {
                const e = this.remind_used[j];
                if (e === remind) flag = false;
            }
            if (!flag) continue;
            var timeout = remind.time == 0 ? 0 : remind.time - date.getTime();
            setTimeout(() => {
                this.config.users.forEach((user: { qq: number; isGroup: boolean }) => {
                    this.logger.info(`正在发送通知到${user.isGroup ? "群聊" : "私聊"}: ${user.qq}`);
                    if (user.isGroup)
                        this.bot
                            .sendGroupMsg(user.qq, remind.message)
                            .catch((err) => this.logger.error(err));
                    else
                        this.bot
                            .sendPrivateMsg(user.qq, remind.message)
                            .catch((err) => this.logger.error(err));
                });
                this.logger.debug(remind.message);
                if (!rmRemind(reminds, remind)) this.logger.error(new Error("移除remind出错"));
                if (!rmRemind(this.remind_used, remind))
                    this.logger.error(new Error("移除remind出错"));
                saveData(this);
            }, timeout);
            this.remind_used.push(remind);
        }
    }
    /** 获取简单的活动列表 */
    async getSimpleActivitys(day: number = 0): Promise<SimpleActivity[]> {
        var path = `/index.php?app=api&mod=Event&act=calendarEventList`;
        var dateTime = new Date();
        var dateTime = new Date(dateTime.setDate(dateTime.getDate() + day));
        var date = `${dateTime.getFullYear()}-${dateTime.getMonth() + 1}-${dateTime.getDate()}`;
        var simpleActives: SimpleActivity[] = [];

        this.logger.info(`正在获取 ${date} 当天的活动...`);

        var data: any;
        try {
            data = await sendPose(
                this.hostName,
                path,
                `oauth_token=${this.oauth_token}&oauth_token_secret=${this.oauth_token_secret}&day=${date}`
            );
        } catch (error) {
            this.logger.error(error);
            return simpleActives;
        }
        if (data.code == 0) {
            this.logger.info(`成功获取到 ${data.content.length} 条活动`);
            data.content.forEach((element: any) => {
                let activity: SimpleActivity = {
                    id: element.id,
                    title: element.title,
                    startTime: Number.parseInt(element.sTime + "000"),
                    endTime: Number.parseInt(element.eTime + "000"),
                };
                simpleActives.push(activity);
                this.logger.debug(`名称: ${activity.title}`);
            });
        } else this.logger.error(new Error(data.message));

        return simpleActives;
    }
    /** 获取活动的详细信息 */
    async getActivity(simpleActive: SimpleActivity): Promise<Activity> {
        this.logger.debug(`正在获取活动对象: id=${simpleActive.id} name=${simpleActive.title}`);

        var path = `/index.php?app=api&mod=Event&act=queryActivityDetailById`;
        var id = simpleActive.id;
        var activity: Activity;
        var data: any;
        try {
            data = await sendPose(
                this.hostName,
                path,
                `oauth_token=${this.oauth_token}&oauth_token_secret=${this.oauth_token_secret}&actiId=${id}`
            );
        } catch (error) {
            throw error;
        }
        if (data.code == 0) {
            activity = {
                id: data.content.actiId,
                title: data.content.name,
                startTime: Number.parseInt(data.content.startTime + "000"),
                endTime: Number.parseInt(data.content.endTime + "000"),
                is_need_sign_out: data.content.is_need_sign_out == "1" ? true : false,
                credit: data.content.credit,
                location: data.content.location,
                sign_address:
                    data.content.sign_address == undefined ? "" : data.content.sign_address,
                limitNum: data.content.limitNum >= 6000000 ? -1 : data.content.limitNum,
                regStartTime: Number.parseInt(data.content.regStartTimeStr + "000"),
                regEndTime: Number.parseInt(data.content.regEndTimeStr + "000"),
                sign_out_start_time: Number.parseInt(data.content.sign_out_start_time + "000"),
                sign_in_start_time: Number.parseInt(data.content.sign_in_start_time + "000"),
                allow_group: data.content.allow_group,
                allow_school: data.content.allow_school,
                allow_year: data.content.allow_year,
            };
        } else throw new Error(data.message);
        return activity;
    }
    /** 过滤活动 */
    filter(activitys: Activity[], filter_string: string): Activity[] {
        var filter: string[] = [];
        filter = filter_string.split(" ");
        filter.unshift("and");

        var dateTime = new Date();
        var dateFomarted = fomartTime(dateTime);
        this.logger.debug(`======开始过滤 当前时间: ${dateFomarted}======`);

        var activitys_filter: Activity[] = [];

        for (let i = 0; i < activitys.length; i++) {
            const activity: Activity = activitys[i];
            this.logger.debug(`开始过滤活动: ${activity.title}`);
            let flag: boolean = true;
            if (activity.regEndTime < dateTime.getTime()) {
                flag = false;
                this.logger.debug(`因为报名已截止, 舍弃该活动`);
                this.logger.debug("----------");
                continue;
            }

            let quitFor = false;
            for (let j = 0; j < filter.length; j = j + 4) {
                if (quitFor) break;
                if (filter.length < 3) break;
                const b = filter[j];
                const s1 = filter[j + 1];
                const c = filter[j + 2];
                const s2 = filter[j + 3];
                const value: any = getFiled(activity, s1);
                switch (b) {
                    case "and":
                        if (!flag) {
                            quitFor = true;
                            break;
                        }
                        switch (c) {
                            case "has":
                                flag =
                                    flag &&
                                    (typeof value == "string"
                                        ? s2 == "null"
                                            ? value == ""
                                            : value == s2
                                        : s2 == "null"
                                        ? value.length == 0
                                        : value.indexOf(s2) != -1);
                                break;
                            case "without":
                                flag =
                                    flag &&
                                    (typeof value == "string"
                                        ? s2 == "null"
                                            ? value != ""
                                            : value != s2
                                        : s2 == "null"
                                        ? value.length != 0
                                        : value.indexOf(s2) == -1);

                                break;
                            default:
                                this.logger.warn("在 has/without 处有表达式错误: " + c);
                                break;
                        }
                        break;
                    case "or":
                        if (flag) {
                            break;
                        }
                        switch (c) {
                            case "has":
                                flag =
                                    flag ||
                                    (typeof value == "string"
                                        ? s2 == "null"
                                            ? value == ""
                                            : value == s2
                                        : s2 == "null"
                                        ? value.length == 0
                                        : value.indexOf(s2) != -1);
                                break;
                            case "without":
                                flag =
                                    flag ||
                                    (typeof value == "string"
                                        ? s2 == "null"
                                            ? value != ""
                                            : value != s2
                                        : s2 == "null"
                                        ? value.length != 0
                                        : value.indexOf(s2) == -1);

                                break;
                            default:
                                this.logger.warn("在 has/without 处有表达式错误: " + c);
                                break;
                        }
                        break;
                    default:
                        this.logger.warn("在 and/or 处有表达式错误: " + b);
                        break;
                }
            }

            if (!flag) this.logger.debug(`因为不符合条件, 该活动已被舍弃`);

            if (flag) {
                this.logger.debug("通过");
                activitys_filter.push(activity);
            }
            this.logger.debug("----------");
        }
        this.logger.info(`舍弃了 ${activitys.length - activitys_filter.length} 条活动`);

        return activitys_filter;
    }
}
var defalutConfig: any = {
    hostName: "pocketuni.net",
    //以下两个属性可以抓包获取
    oauth_token: "",
    oauth_token_secret: "",
    //使用较为自然的语言过滤Activity对象里的条目
    //格式为 [属性名 has/without 属性值] and/or [属性名 has/without 属性值] ... 不要有多余的空格
    //目标属性值为字符串时，has则表示==(等于)，目标属性值为数组时，has则表示indexOf(包含)，without则相反
    //and/or就是与 或
    //属性值可以为“null”，表示字符串为undefined或数组为空数组
    //例如"allow_year has null and allow_school has null"表示allow_year和allow_school都为空
    filter_string: "",
    //需要发送提醒的用户, 以{qq:number,isGroup:boolean}数组的形式
    users: [],
};
var defaultData: Data = {
    geted: [],
    reminds: [],
};
type Data = {
    geted: [];
    reminds: [];
};
type Remind = {
    //time: 时间戳，为 0 时，会在被加载时立即发送message
    time: number;
    message: string;
};
type SimpleActivity = {
    id: number;
    title: string;
    startTime: number;
    endTime: number;
};
type Activity = {
    id: number;
    title: string;
    startTime: number;
    endTime: number;
    //是否需要签到
    is_need_sign_out: boolean;
    //学分
    credit: number;
    //活动地点
    location: string;
    //签到地点
    sign_address: string;
    //可加入人数
    limitNum: number;
    //报名开始时间
    regStartTime: number;
    //报名结束时间
    regEndTime: number;
    //签退开始时间
    sign_out_start_time: number;
    //签到时间
    sign_in_start_time: number;
    //活动对象
    allow_group: string[];
    //活动院系
    allow_school: string[];
    //活动年级
    allow_year: string[];
};
function rmRemind(reminds: Remind[], remind: Remind): boolean {
    for (let i = 0; i < reminds.length; i++) {
        if (reminds[i] === remind) {
            reminds.splice(i, 1);
            return true;
        }
    }
    return false;
}

/** 发送post请求 */
function sendPose(host: string, path: string, data: string) {
    return new Promise((resolve, reject) => {
        const options: https.RequestOptions = {
            hostname: host,
            path: path,
            method: "POST",
            headers: {
                "Content-Length": Buffer.byteLength(data),
                "User-Agent": "client:Android version:6.8.80 Product:Redmi K50 Pro OsVersion:12",
                "Content-Type": "application/x-www-form-urlencoded",
                Connection: "Keep-Alive",
                "Accept-Encoding": "gzip",
            },
        };
        var respData: string = "";
        const req = https.request(options, (res) => {
            res.on("data", (d: Buffer) => {
                respData += d.toString("utf-8");
            });
        });
        req.on("error", (error) => {
            reject(error);
        });
        req.on("close", () => {
            try {
                let jsonData = JSON.parse(respData);
                resolve(jsonData);
            } catch (error) {
                console.log(respData);
                reject(error);
            }
        });
        req.write(data);
        req.end();
    });
}
/** 根据字符串获取对象的属性 */
function getFiled<T extends object>(obj: T, key: string) {
    for (const _key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, _key)) {
            const element = obj[_key];
            if (_key == key) return element;
        }
    }
    return undefined;
}
/** 获取格式化的时间 */
function fomartTime(date: Date): string {
    let mo = date.getMonth() + 1;
    let d = date.getDate();
    let h = date.getHours();
    let m = date.getMinutes();
    //修复时区对时间显示的影响
    var timezone = -date.getTimezoneOffset();
    if (timezone != 480) h += timezone / 60;
    return `${mo}/${d} ${h < 10 ? "0" + h : h}:${m < 10 ? "0" + m : m}`;
}
function sleep(timeout: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, timeout));
}
