import NodeRSA from "node-rsa";
import http from "http";
import { getConfig, saveConfig } from "../lib/pluginFather";
import { BotPlugin, BotPluginConfig, LoadArea } from "../lib/plugin";
import { BotClient } from "../lib/core/client";
var defaultConfig = {
    QQ: "用户的qq",
    PhoneNumber: "电话号码(必填)",
    Password: "密码(必填)",
    RoomNum: "APP内的房间号编号(必填)",
    Token: "",
    Studid: "",
    Cardid: "身份证号，不用填，程序会自动获取",
    Waterid: 0,
    PublicKey: "掌上智慧校园的加密公钥，需要逆向APP查看源码获得",
    APP请求地址前缀: "需要逆向APP查看源码获得",
    水表关阀接口: "需要逆向APP查看源码获得",
    水表开阀接口: "需要逆向APP查看源码获得",
    水表用量接口: "需要逆向APP查看源码获得",
    登录接口: "需要逆向APP查看源码获得",
    电费查询接口: "需要逆向APP查看源码获得",
};
interface Response {
    code: string;
    message: string;
    total: number;
    rows: Array<any>;
}
export class PluginConfig implements BotPluginConfig {
    LoadArea: LoadArea = "GLOBAL";
    PluginName: string = "Fuck掌上智慧校园";
    BotVersion: string = "0.0.1";
    PluginVersion: string = "1.0.0";
    Info: string = "用来控制学校的水阀";
    Event: string[] = ["system.online"];
    Keyword: string[] = ["^开水", "^关水", "^查电费"];
}
export class Plugin extends BotPlugin {
    private inited: boolean = false;
    private userMoney: number = 0;
    private balance: number = 0;
    private count: number = 1;
    private intervalTimeout: NodeJS.Timer | undefined;
    private 用量提醒: boolean = false;
    constructor(botClient: BotClient) {
        super(botClient, new PluginConfig());
        this.config = getConfig(this, defaultConfig);
    }

    event(eventName: string) {
        switch (eventName) {
            case "system.online":
                this.init();
                break;
        }
    }
    keyword(keyword: string, data: any) {
        if (data.sender.user_id == this.config.QQ) {
            switch (keyword) {
                case "^开水":
                    this.开水()
                        .then((resp) => {
                            if (resp != undefined || resp != "")
                                this.bot.sendPrivateMsg(this.config.QQ, resp).catch((err) => {
                                    this.logger.error(err);
                                });
                        })
                        .catch((err: any) => {
                            this.logger.warn(err);
                        });

                    break;

                case "^关水":
                    this.关水()
                        .then((resp) => {
                            if (resp != undefined || resp != "")
                                this.bot.sendPrivateMsg(this.config.QQ, resp).catch((err) => {
                                    this.logger.error(err);
                                });
                        })
                        .catch((err: any) => {
                            this.logger.error(err);
                        });

                    break;
                case "^查电费":
                    this.查电费().then((resp) => {
                        this.bot.sendPrivateMsg(this.config.QQ, resp).catch((err) => {
                            this.logger.error(err);
                        });
                    });

                    break;
            }
        }
    }
    特殊原因关水(msg: string, flag?: boolean) {
        this.用量提醒 = false;
        if (flag == true) {
            if (this.intervalTimeout != undefined) clearInterval(this.intervalTimeout);
        }
        this.bot
            .sendPrivateMsg(
                this.config.QQ,
                `${msg}\n本次消费澡币:${this.userMoney}\n澡币余额:${this.balance}`
            )
            .catch((err) => {
                this.logger.error(err);
            });
    }
    async init() {
        if (this.config.Studid == "" || this.config.Token == "" || this.config.Cardid == "") {
            await this.login().catch((err) => {
                this.logger.info("初始化登录失败");
                this.logger.error(err);
            });
        }
        this.查电费().then((str) => {
            let power = /(?<=剩余电量: ).*?(?=\n)/g.exec(str);
            if (power != undefined) {
                this.logger.info("自动查询到剩余电量: " + power[0]);
                if (10 > parseInt(power[0]))
                    this.bot.sendPrivateMsg(this.config.QQ, "电量告急\n" + str).catch((err) => {
                        this.logger.error(err);
                    });
            } else this.logger.error("自动查询到剩余电量为空");
        });

        this.logger.info("初始化成功");
        this.inited = true;
    }
    async login() {
        let param = 加密和编码(
            `{"switc":"1","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
            this.config.PublicKey
        );
        let data = `param=${param}&userinfo=${this.config.PhoneNumber}&password=${this.config.Password}`;
        let json: any = await sendPose(
            this.config.APP请求地址前缀,
            this.config.登录接口,
            data
        ).catch((err: any) => {
            throw err;
        });
        this.config.Token = json.rows[0].token;
        this.config.Studid = json.rows[0].studentID;
        this.config.Cardid = json.rows[0].cardid;
        saveConfig(this);
    }
    async 查询用量() {
        if (!this.inited) {
            this.logger.warn("初始化未完成，未查询用量");
        }
        let param = 加密和编码(
            `{"Studid":"${
                this.config.Studid
            }","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
            this.config.PublicKey
        );
        let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&waterid=${this.config.Waterid}`;
        let json: any = await sendPose(
            this.config.APP请求地址前缀,
            this.config.水表用量接口,
            data
        ).catch((err: any) => {
            this.logger.error("查询请求失败: ", err);
        });

        if (json.code == "1") {
            this.userMoney = json.rows[0].usermoney;
            this.balance = json.rows[0].balance;
            switch (json.rows[0].userflag) {
                case "2":
                    this.count = 1;
                    throw new Error("你的账户余额已不足");

                case "3":
                    this.count = 1;
                    throw new Error("5分钟内未使用热水");

                case "4":
                    this.count = 1;
                    throw new Error("单次最多使用30分钟");

                case "5":
                    this.count = 1;
                    throw new Error("用户已点击结算");

                case "6":
                    this.count = 1;
                    throw new Error("单次使用超过最大金额限制");
                default:
                    if (this.用量提醒) break;
                    if (this.userMoney > this.count * 5) {
                        this.bot
                            .sendPrivateMsg(this.config.QQ, `本次用水已经超过${5 * this.count}元!`)
                            .then(() => {
                                this.count++;
                            })
                            .catch((err) => {
                                this.logger.error(err);
                                this.用量提醒 = false;
                            });
                        this.用量提醒 = true;
                    }
                    break;
            }
        } else {
            this.logger.warn("查询失败:\n", json);
        }
    }
    async 开水(): Promise<string> {
        this.userMoney = 0;
        let resp = "未知回复";
        if (!this.inited) {
            return "初始化未完成，5秒后重试";
        }
        let param = 加密和编码(
            `{"Studid":"${
                this.config.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.config.PublicKey
        );
        let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&RoomNum=${this.config.RoomNum}`;
        let json: any = await sendPose(
            this.config.APP请求地址前缀,
            this.config.水表开阀接口,
            data
        ).catch((err: any) => {
            throw err;
        });
        switch (json.code) {
            case "1":
                if (this.config.Waterid != json.rows[0].waterid) {
                    this.config.Waterid = json.rows[0].waterid;
                    saveConfig(this);
                }
                if (json.rows[0].info == "OPENOK") {
                    resp = "水阀:" + json.rows[0].dormitory + " 被成功开启";
                    this.logger.info("开启水阀");
                    this.intervalTimeout = setInterval(() => {
                        this.查询用量().catch((err) => {
                            this.特殊原因关水(err.message, true);
                        });
                    }, 20000);
                }
                break;
            case "12342":
                //登录信息过期
                await this.login().catch((err) => {
                    this.logger.error("登录失败: ", err);
                    return "登录失败";
                });
                return await this.开水().catch((err) => {
                    throw err;
                });

            case "007":
                resp = json.message;
                break;
        }

        return resp;
    }
    async 关水(): Promise<string> {
        this.用量提醒 = false;
        let resp = "未知回复";
        if (!this.inited) {
            this.logger.info("初始化未完成，5秒后重试");
            setTimeout(() => {
                this.关水()
                    .then((resp) => {
                        return resp;
                    })
                    .catch((err) => {
                        throw err;
                    });
            }, 5000);
        }
        if (this.intervalTimeout != undefined) clearInterval(this.intervalTimeout);
        await this.查询用量().catch((err) => {
            this.特殊原因关水(err.message);
            throw err;
        });
        let param = 加密和编码(
            `{"Studid":"${
                this.config.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.config.PublicKey
        );
        let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&RoomNum=${this.config.RoomNum}&waterid=${this.config.Waterid}`;

        let json = await sendPose(
            this.config.APP请求地址前缀,
            this.config.水表关阀接口,
            data
        ).catch((err: any) => {
            throw err;
        });

        switch (json.code) {
            case "1":
                if (json.rows[0].info == "CLOSEOK") {
                    resp =
                        "成功关闭\n本次消费澡币:" + this.userMoney + "\n剩余澡币:" + this.balance;
                    this.logger.info("关闭水阀");
                }
                break;
            case "12342":
                //登录信息过期
                await this.login().catch((err) => {
                    this.logger.error("登录失败: ", err);
                    return "登录失败";
                });
                return await this.关水().catch((err) => {
                    throw err;
                });

            case "007":
                resp = json.message;
                break;
        }

        this.count = 1;
        return resp;
    }
    async 查电费(): Promise<string> {
        let resp = "";
        let param = 加密和编码(
            `{"Studid":"${this.config.Studid}","userinfo":"${
                this.config.PhoneNumber
            }","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
            this.config.PublicKey
        );
        let data = `param=${param}"&cardid=${this.config.Cardid}&token=${this.config.Token}&switc=1&susenum=${this.config.电费查询房间}`;
        let json: Response = await sendPose(
            this.config.APP请求地址前缀,
            this.config.电费查询接口,
            data
        ).catch((err: any) => {
            throw err;
        });
        switch (json.code) {
            case "1":
                resp = `状态: ${json.rows[0].zhuangtai}\n剩余电量: ${json.rows[0].shengyupower}\n当前功率: ${json.rows[0].nowgonglv}\n采集时间: ${json.rows[0].caijitime}`;
                break;
            case "12342":
                //登录信息过期
                await this.login().catch((err) => {
                    this.logger.error("登录失败: ", err);
                    return "登录失败";
                });
                return await this.查电费();

            default:
                resp = json.message;
                break;
        }
        return resp;
    }
}

function getOnlyID() {
    //随机字符串：时间戳 + 取3次随机数（11111, 9999999）拼接
    return (
        new Date().getTime().toString() +
        GetRandomNum(11111, 9999999).toString() +
        GetRandomNum(11111, 9999999).toString() +
        GetRandomNum(11111, 9999999).toString()
    );
}
function getCodeingTime() {
    //时间戳substring(0, 10)
    return new Date().getTime().toString().substring(0, 10);
}
function GetRandomNum(Min: number, Max: number) {
    var Range = Max - Min;
    var Rand = Math.random();
    return Min + Math.round(Rand * Range);
}

function 加密和编码(data: string, publicKey: string): string {
    const a_public_key = new NodeRSA(publicKey);
    a_public_key.setOptions({ encryptionScheme: "pkcs1" });
    return encodeURIComponent(a_public_key.encrypt(data, "base64"));
}

function sendPose(hostname: string, path: string, data: string): any {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            port: 52119,
            path: path,
            method: "POST",
            headers: {
                "Content-Length": data.length,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; HUAWEI P20)",
                Connection: "Keep-Alive",
                "Accept-Encoding": "gzip",
            },
        };

        const req = http.request(options, (res) => {
            res.on("data", (d) => {
                // console.log(d.toString());
                resolve(JSON.parse(d.toString()));
            });
        });

        req.on("error", (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
