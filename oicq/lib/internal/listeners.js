"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindInternalListeners = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsqr_1 = __importDefault(require("jsqr"));
const pngjs_1 = require("pngjs");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const core_1 = require("../core");
const common_1 = require("../common");
const sysmsg_1 = require("./sysmsg");
const pbgetmsg_1 = require("./pbgetmsg");
const onlinepush_1 = require("./onlinepush");
async function pushNotifyListener(payload) {
    if (!this._sync_cookie)
        return;
    try {
        var nested = core_1.jce.decodeWrapper(payload.slice(4));
    }
    catch {
        var nested = core_1.jce.decodeWrapper(payload.slice(15));
    }
    switch (nested[5]) {
        case 33: //群员入群
        case 38: //建群
        case 85: //群申请被同意
        case 141: //陌生人
        case 166: //好友
        case 167: //单向好友
        case 208: //好友语音
        case 529: //离线文件
            return pbgetmsg_1.pbGetMsg.call(this);
        case 84: //群请求
        case 87: //群邀请
        case 525: //群请求(来自群员的邀请)
            return sysmsg_1.getGrpSysMsg.call(this);
        case 187: //好友请求
        case 191: //单向好友增加
            return sysmsg_1.getFrdSysMsg.call(this);
        case 528: //黑名单同步
            return this.reloadBlackList();
    }
}
const events = {
    "OnlinePush.PbPushGroupMsg": onlinepush_1.groupMsgListener,
    "OnlinePush.PbPushDisMsg": onlinepush_1.discussMsgListener,
    "OnlinePush.ReqPush": onlinepush_1.onlinePushListener,
    "OnlinePush.PbPushTransMsg": onlinepush_1.onlinePushTransListener,
    "OnlinePush.PbC2CMsgSync": onlinepush_1.dmMsgSyncListener,
    "MessageSvc.PushNotify": pushNotifyListener,
    "MessageSvc.PushReaded": pbgetmsg_1.pushReadedListener,
};
/** 事件总线, 在这里捕获奇怪的错误 */
async function eventsListener(cmd, payload, seq) {
    try {
        await Reflect.get(events, cmd)?.call(this, payload, seq);
    }
    catch (e) {
        this.logger.debug(e);
    }
}
/** 上线后加载资源 */
async function onlineListener(token, nickname, gender, age) {
    this.nickname = nickname;
    this.age = age;
    this.sex = gender ? (gender === 1 ? "male" : "female") : "unknown";
    // 恢复之前的状态
    this.status = this.status || common_1.OnlineStatus.Online;
    this.setOnlineStatus(this.status).catch(common_1.NOOP);
    // 存token
    tokenUpdatedListener.call(this, token);
    this.logger.mark(`Welcome, ${this.nickname} ! 正在加载资源...`);
    await Promise.allSettled([
        this.reloadFriendList(),
        this.reloadGroupList(),
        this.reloadStrangerList(),
        this.reloadBlackList(),
    ]);
    this.logger.mark(`加载了${this.fl.size}个好友，${this.gl.size}个群，${this.sl.size}个陌生人`);
    pbgetmsg_1.pbGetMsg.call(this).catch(common_1.NOOP);
    this.em("system.online");
}
function tokenUpdatedListener(token) {
    fs.writeFile(path.join(this.dir, "token"), token, common_1.NOOP);
}
function kickoffListener(message) {
    this.logger.warn(message);
    this.terminate();
    fs.unlink(path.join(this.dir, "token"), () => {
        this.em("system.offline.kickoff", { message });
    });
}
function qrcodeListener(image) {
    const file = path.join(this.dir, "qrcode.png");
    fs.writeFile(file, image, () => {
        try {
            const qrdata = pngjs_1.PNG.sync.read(image);
            const qr = (0, jsqr_1.default)(new Uint8ClampedArray(qrdata.data), qrdata.width, qrdata.height);
            qrcode_terminal_1.default.generate(qr.data, console.log);
        }
        catch { }
        this.logger.mark("请用手机QQ扫描二维码，若打印出错请打开：" + file);
        this.em("system.login.qrcode", { image });
    });
}
function sliderListener(url) {
    this.logger.mark("收到滑动验证码，请访问以下地址完成滑动，并从网络响应中取出ticket输入：" + url);
    this.em("system.login.slider", { url });
}
function verifyListener(url, phone) {
    this.logger.mark("登录保护二维码验证地址：" + url.replace("verify", "qrcode"));
    this.logger.mark("密保手机号：" + phone);
    return this.em("system.login.device", { url, phone });
}
/**
 * 登录相关错误
 * @param code -2服务器忙 -3上线失败(需要删token)
 */
function loginErrorListener(code, message) {
    // toke expired
    if (!code) {
        this.logger.mark("登录token过期");
        fs.unlink(path.join(this.dir, "token"), () => {
            this.login();
        });
    }
    // network error
    else if (code < 0) {
        this.terminate();
        this.logger.error(message);
        if (code === -3) //register failed
            fs.unlink(path.join(this.dir, "token"), common_1.NOOP);
        const t = this.config.reconn_interval;
        if (t >= 1) {
            this.logger.mark(t + "秒后重新连接");
            setTimeout(this.login.bind(this), t * 1000);
        }
        this.em("system.offline.network", { message });
    }
    // login error
    else if (code > 0) {
        this.logger.error(message);
        this.em("system.login.error", { code, message });
    }
}
function qrcodeErrorListener(code, message) {
    this.logger.error(`二维码扫码遇到错误: ${code} (${message})`);
    this.logger.mark("二维码已更新");
    this.login();
}
function bindInternalListeners() {
    this.on("internal.online", onlineListener);
    this.on("internal.kickoff", kickoffListener);
    this.on("internal.token", tokenUpdatedListener);
    this.on("internal.qrcode", qrcodeListener);
    this.on("internal.slider", sliderListener);
    this.on("internal.verify", verifyListener);
    this.on("internal.error.token", loginErrorListener);
    this.on("internal.error.login", loginErrorListener);
    this.on("internal.error.qrcode", qrcodeErrorListener);
    this.on("internal.error.network", loginErrorListener);
    this.on("internal.sso", eventsListener);
}
exports.bindInternalListeners = bindInternalListeners;
