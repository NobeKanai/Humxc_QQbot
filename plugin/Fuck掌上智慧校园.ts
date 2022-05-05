import NodeRSA from "node-rsa";
import http from "http";
import {
    BotPlugin,
    BotPluginConfig,
    BotPluginProfile,
    BotPluginUser,
    PluginUserType,
} from "../lib/plugin";
import { BotClient } from "../lib/core/client";

/** 保存到配置文件的User */
interface User extends BotPluginUser {
    PhoneNumber: string;
    Password: string;
    WaterRoomNum: string;
    ElectricRoomNum: string;
}

/** 插件运行时使用的User */
class IUser implements User {
    Name: string = "";
    PhoneNumber: string;
    Password: string;
    WaterRoomNum: string;
    ElectricRoomNum: string;
    Token: string = "";
    Studid: string = "";
    Waterid: number = 0;
    WaterCoinA: string = "";
    WaterCoinB: string = "";
    uid: number;
    type: PluginUserType;
    Cardid: string = "0";
    constructor(user: User) {
        this.PhoneNumber = user.PhoneNumber;
        this.Password = user.Password;
        this.WaterRoomNum = user.WaterRoomNum;
        this.ElectricRoomNum = user.ElectricRoomNum;
        this.type = user.type;
        this.uid = user.uid;
    }
}
export class PluginConfig implements BotPluginConfig {
    Users: User[] = [
        {
            type: "Person",
            uid: 0,
            PhoneNumber: "电话号码，(必填)",
            Password: "密码(必填)",
            WaterRoomNum: "",
            ElectricRoomNum: "",
        },
    ];
    PublicKey: string = "掌上智慧校园的加密公钥，需要逆向APP查看源码获得";
}
interface Response {
    // code: 1-操作成功, 12342-登录信息过期
    code: "1" | "12342";
    message: string;
    total: number;
    title: string;
}
interface Response_Login extends Response {
    rows: [
        {
            studentID: string;
            phone: string;
            xh: string;
            cardid: string;
            name: string;
            imei: string;
            balance: string;
            balance2: string;
            gxb: string;
            xzdl: "NO" | "Yes";
            xzyy: string;
            sfqf: string;
            token: string;
            root: "NO" | "Yes";
        }
    ];
}
interface Response_WaterValue_Open extends Response {
    rows: [{ info: "OPENOK"; dormitory: string; waterid: number }];
}
interface Response_WaterValue_Close extends Response {
    rows: [{ info: "CLOSEOK" }];
}
interface Response_WaterValue_Check extends Response {
    rows: [{ userflag: string; balance: string; balance2: string; usermoney: number }];
}
interface Response_ElectricBill_Check extends Response {
    rows: [
        {
            zhuangtai: string;
            shengyupower: number;
            nowgonglv: string;
            caijitime: string;
        }
    ];
}

/** 电费查询结果 */
type CebResult = { state: string; stock: number; power: string; collectTime: string };

/** 水表查询结果 */
type CwvResult = {
    usedWaterCoin: number;
    message:
        | ""
        | "正在使用"
        | "已关闭水阀: 你的账户余额已不足"
        | "已关闭水阀: 5分钟内未使用热水"
        | "已关闭水阀: 单次最多使用30分钟"
        | "已关闭水阀: 用户已点击结算"
        | "已关闭水阀: 单次使用超过最大金额限制";
};
export class PluginProfile implements BotPluginProfile {
    PluginName: string = "Fuck掌上智慧校园";
    BotVersion: string = "0.0.1";
    PluginVersion: string = "1.0.0";
    Info: string = "实现掌上智慧校园的部分功能";
}
export class Plugin extends BotPlugin<PluginConfig> {
    private PublicKey: string = "";
    private Host: string = "www.zhang.guolianrobot.com";
    private WaterValuePath_Open: string = "/Jiangapp/Home/Takeshower/iotclocksever/Iot_Open.php";
    private WaterValuePath_Close: string = "/Jiangapp/Home/Takeshower/iotclocksever/Iot_Close.php";
    private WaterValuePath_Check: string =
        "/Jiangapp/Home/Takeshower/iotclocksever/Iot_User_Money.php";
    private LoginPath: string = "/Jiangapp/Main/login.php";
    private ElectricBillPath_Check: string = "/Jiangapp/Home/PaymentCenter/Power/SchoolPower.php";
    private iUsers: Map<number, IUser> = new Map<number, IUser>();
    public init(): void {
        this.PublicKey = `-----BEGIN PUBLIC KEY-----\n${this.config.PublicKey}\n-----END PUBLIC KEY-----`;
        this.initUser();
        this.client.on("bot.newday", () => {
            setTimeout(async () => {
                for (const user of this.iUsers.values()) {
                    let f = this.client.pickFriend(user.uid);
                    let result: CebResult = {
                        state: "",
                        stock: 0,
                        power: "",
                        collectTime: "",
                    };
                    // 登录
                    if (user.Token == "") {
                        try {
                            await this.login(user);
                        } catch (error) {
                            this.logger.warn(error);
                            f.sendMsg((<Error>error).message).catch((err) => {
                                this.logger.error(err);
                            });
                            continue;
                        }
                    }
                    try {
                        result = await this.checkElectricBill(user);
                    } catch (error) {
                        this.logger.warn(error);
                        continue;
                    }
                    if (result.stock < 10) {
                        f.sendMsg(
                            `状态: ${result.state}\n剩余电量: ${result.stock}\n采集功率: ${
                                result.power
                            }\n采集时间: ${result.collectTime.substring(5, 16)}`
                        ).catch((err) => {
                            this.logger.error(err);
                        });
                    }
                    await sleep(10000);
                }
            }, 25200000);
        });
        this.regKeyword("^开水$", "private", "plugin_user", async (message) => {
            let count = 1;
            let checkResult: CwvResult = {
                usedWaterCoin: 0,
                message: "",
            };
            let user = <IUser>this.iUsers.get(message.sender.user_id);
            // 登录
            if (user.Token == "") {
                try {
                    await this.login(user);
                } catch (error) {
                    this.logger.error(error);
                    message.reply((<Error>error).message).catch((err) => {
                        this.logger.error(err);
                    });
                    return;
                }
            }
            // 开水
            try {
                await this.openWaterValue(user);
            } catch (error) {
                this.logger.warn(error);
                if ((<Error>error).message == "开阀失败: 登录信息已过期") {
                    user.Token = "";
                    message.reply("开阀失败: 登录信息已过期, 请重试").catch((err) => {
                        this.logger.error(err);
                    });
                    return;
                }
            }
            message.reply(`水阀 ${user.WaterRoomNum} 已开启`).catch((err) => {
                this.logger.error(err);
            });

            // 查询用量
            while (true) {
                await sleep(20000);
                if (user.Waterid == 0) break;
                try {
                    checkResult = await this.checkWaterValue(user);
                } catch (error) {
                    this.logger.warn(error);
                    message.reply((<Error>error).message).catch((err) => {
                        this.logger.error(err);
                    });
                }
                if (checkResult.message !== "正在使用") {
                    message
                        .reply(
                            checkResult.message +
                                `\n本次用水消耗澡币: ${checkResult.usedWaterCoin}\n剩余澡币: ${user.WaterCoinA}`
                        )
                        .catch((err) => {
                            this.logger.error(err);
                        });
                    return;
                }

                // 消耗过多提醒
                if (checkResult.usedWaterCoin >= 5 * count) {
                    message.reply("本次用水已超过 " + 5 * count + "元!").catch((err) => {
                        this.logger.error(err);
                    });
                    count++;
                }
            }
        });
        this.regKeyword("^关水$", "private", "plugin_user", async (message) => {
            let checkResult: CwvResult = {
                usedWaterCoin: 0,
                message: "",
            };
            let user = <IUser>this.iUsers.get(message.sender.user_id);
            // 登录
            if (user.Token == "") {
                try {
                    await this.login(user);
                } catch (error) {
                    this.logger.error(error);
                    message.reply((<Error>error).message).catch((err) => {
                        this.logger.error(err);
                    });
                    return;
                }
            }
            // 查询用量
            try {
                checkResult = await this.checkWaterValue(user);
            } catch (error) {
                this.logger.warn(error);
                message.reply((<Error>error).message).catch((err) => {
                    this.logger.error(err);
                });
                return;
            }
            if (checkResult.message !== "正在使用") {
                message
                    .reply(
                        checkResult.message +
                            `\n本次用水消耗澡币: ${checkResult.usedWaterCoin}\n剩余澡币: ${user.WaterCoinA}`
                    )
                    .catch((err) => {
                        this.logger.error(err);
                    });
                return;
            }

            // 关水
            try {
                await this.closeWaterValue(user);
            } catch (error) {
                this.logger.warn(error);
                if ((<Error>error).message == "关阀失败: 登录信息已过期") {
                    message.reply("关阀失败: 登录信息已过期, 请重试").catch((err) => {
                        this.logger.error(err);
                    });
                    return;
                }
            }
            let msg = `水阀 ${user.WaterRoomNum} 已关闭`;
            if (checkResult.message == "正在使用") {
                msg += `\n本次用水消耗澡币: ${checkResult.usedWaterCoin}\n剩余澡币: ${user.WaterCoinA}`;
            }

            message.reply(msg).catch((err) => {
                this.logger.error(err);
            });
        });
        this.regKeyword("^查电$", "private", "plugin_user", async (message) => {
            let result: CebResult = {
                state: "",
                stock: 0,
                power: "",
                collectTime: "",
            };
            let user = <IUser>this.iUsers.get(message.sender.user_id);
            // 登录
            if (user.Token == "") {
                try {
                    await this.login(user);
                } catch (error) {
                    this.logger.warn(error);
                    message.reply((<Error>error).message).catch((err) => {
                        this.logger.error(err);
                    });
                    return;
                }
            }

            // 查电
            try {
                result = await this.checkElectricBill(user);
            } catch (error) {
                this.logger.warn(error);
                message.reply((<Error>error).message).catch((err) => {
                    this.logger.error(err);
                });
                return;
            }

            message
                .reply(
                    `状态: ${result.state}\n剩余电量: ${result.stock}\n采集功率: ${
                        result.power
                    }\n采集时间: ${result.collectTime.substring(5, 16)}`
                )
                .catch((err) => {
                    this.logger.error(err);
                });
        });
    }

    /** 初始化用户 */
    async initUser(): Promise<void> {
        for (let i = 0; i < this.config.Users.length; i++) {
            const user = this.config.Users[i];
            let iUser = new IUser(user);
            this.iUsers.set(user.uid, iUser);
        }
    }

    /** 登录 */
    async login(user: IUser): Promise<void> {
        this.logger.info(`尝试为 [${user.PhoneNumber}] 登录...`);
        let param = encryptAndEncode(
            `{"switc":"1","Onlyid":"${getOnlyID()}","Codetime":"${getCodeingTime()}"}`,
            this.PublicKey
        );
        let data = `param=${param}&userinfo=${user.PhoneNumber}&password=${user.Password}`;
        let resp: Response_Login;
        try {
            resp = await sendPose(this.Host, this.LoginPath, data);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
        if (resp.code == "1") {
            user.Cardid = resp.rows[0].cardid;
            user.Studid = resp.rows[0].studentID;
            user.Token = resp.rows[0].token;
            user.WaterCoinA = resp.rows[0].balance;
            user.WaterCoinB = resp.rows[0].balance2;
            user.Name = resp.rows[0].name;
            return;
        } else {
            throw new Error(`登录失败: ${resp.message}`);
        }
    }

    /** 开水阀 */
    async openWaterValue(user: IUser): Promise<void> {
        let param = encryptAndEncode(
            `{"Studid":"${
                user.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.PublicKey
        );
        let data = `param=${param}&cardid=${user.Cardid}&token=${user.Token}&RoomNum=${user.WaterRoomNum}`;
        let resp: Response_WaterValue_Open;
        try {
            resp = await sendPose(this.Host, this.WaterValuePath_Open, data);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
        if (resp.code == "1") {
            user.Waterid = resp.rows[0].waterid;
        } else {
            if (resp.code == "12342") {
                resp.message += ", 请重试";
                user.Token = "";
            }
            throw new Error(`开阀失败: ${resp.message}`);
        }
    }

    /** 关闭水阀 */
    async closeWaterValue(user: IUser): Promise<void> {
        if (user.Waterid == 0) {
            throw new Error("关阀失败: 还没有开阀");
        }
        let param = encryptAndEncode(
            `{"Studid":"${
                user.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.PublicKey
        );
        let data = `param=${param}&cardid=${user.Cardid}&token=${user.Token}&RoomNum=${user.WaterRoomNum}&waterid=${user.Waterid}`;

        let resp: Response_WaterValue_Close;
        try {
            resp = await sendPose(this.Host, this.WaterValuePath_Close, data);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
        if (resp.code != "1") {
            if (resp.code == "12342") {
                resp.message += ", 请重试";
                user.Token = "";
            }
            throw new Error(`关阀失败: ${resp.message}`);
        }
        user.Waterid = 0;
    }

    /** 水表用量查询 */
    async checkWaterValue(user: IUser): Promise<CwvResult> {
        if (user.Waterid == 0) {
            throw new Error("水阀查询失败: 还没有开阀");
        }
        let param = encryptAndEncode(
            `{"Studid":"${
                user.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.PublicKey
        );
        let data = `param=${param}&cardid=${user.Cardid}&token=${user.Token}&waterid=${user.Waterid}`;

        let resp: Response_WaterValue_Check;
        try {
            resp = await sendPose(this.Host, this.WaterValuePath_Check, data);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
        if (resp.code != "1") {
            if (resp.code == "12342") {
                resp.message += ", 请重试";
                user.Token = "";
            }
            throw new Error(`水阀查询失败: ${resp.message}`);
        } else {
            let result: CwvResult = {
                usedWaterCoin: 0,
                message: "",
            };
            user.WaterCoinA = resp.rows[0].balance;
            user.WaterCoinB = resp.rows[0].balance2;
            result.usedWaterCoin = resp.rows[0].usermoney;
            switch (resp.rows[0].userflag) {
                case "1":
                    result.message = "正在使用";
                    break;
                case "2":
                    result.message = "已关闭水阀: 你的账户余额已不足";
                    break;
                case "3":
                    result.message = "已关闭水阀: 5分钟内未使用热水";
                    break;
                case "4":
                    result.message = "已关闭水阀: 单次最多使用30分钟";
                    break;
                case "5":
                    result.message = "已关闭水阀: 用户已点击结算";
                    break;
                case "6":
                    result.message = "已关闭水阀: 单次使用超过最大金额限制";
            }
            return result;
        }
    }

    /** 电表用量查询 */
    async checkElectricBill(user: IUser): Promise<CebResult> {
        let param = encryptAndEncode(
            `{"Studid":"${
                user.Studid
            }","Onlyid":"${getOnlyID()}","SysInfo":"android","Codetime":"${getCodeingTime()}"}`,
            this.PublicKey
        );
        let data = `param=${param}&cardid=${user.Cardid}&token=${user.Token}&switc=1&susenum=${user.ElectricRoomNum}`;
        let resp: Response_ElectricBill_Check;
        try {
            resp = await sendPose(this.Host, this.ElectricBillPath_Check, data);
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
        if (resp.code != "1") {
            if (resp.code == "12342") {
                resp.message += ", 请重试";
                user.Token = "";
            }
            throw new Error(`电表查询失败: ${resp.message}`);
        }
        let result: CebResult = {
            state: resp.rows[0].zhuangtai,
            stock: resp.rows[0].shengyupower,
            power: resp.rows[0].nowgonglv,
            collectTime: resp.rows[0].caijitime,
        };

        return result;
    }

    /** 保存配置 */
    saveConfig(): boolean {
        return super.saveConfig();
    }
}

/** 获取唯一id */
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

function encryptAndEncode(data: string, publicKey: string): string {
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
async function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), time);
    });
}
