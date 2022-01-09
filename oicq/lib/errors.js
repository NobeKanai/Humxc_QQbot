"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginErrorCode = exports.drop = exports.ErrorCode = void 0;
const core_1 = require("./core");
/** 不包括服务器返回的其他具体错误 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["ClientNotOnline"] = -1] = "ClientNotOnline";
    /** 发包超时未收到服务器回应 */
    ErrorCode[ErrorCode["PacketTimeout"] = -2] = "PacketTimeout";
    ErrorCode[ErrorCode["UserNotExists"] = -10] = "UserNotExists";
    ErrorCode[ErrorCode["GroupNotJoined"] = -20] = "GroupNotJoined";
    ErrorCode[ErrorCode["MemberNotExists"] = -30] = "MemberNotExists";
    /** 传入的消息参数不正确 */
    ErrorCode[ErrorCode["MessageBuilderError"] = -60] = "MessageBuilderError";
    /** 群消息被风控 */
    ErrorCode[ErrorCode["RiskMessageError"] = -70] = "RiskMessageError";
    /** 群消息有敏感词发送失败 */
    ErrorCode[ErrorCode["SensitiveWordsError"] = -80] = "SensitiveWordsError";
    ErrorCode[ErrorCode["HighwayTimeout"] = -110] = "HighwayTimeout";
    ErrorCode[ErrorCode["HighwayNetworkError"] = -120] = "HighwayNetworkError";
    ErrorCode[ErrorCode["NoUploadChannel"] = -130] = "NoUploadChannel";
    ErrorCode[ErrorCode["OfflineFileNotExists"] = -160] = "OfflineFileNotExists";
    ErrorCode[ErrorCode["FFmpegVideoThumbError"] = -210] = "FFmpegVideoThumbError";
    ErrorCode[ErrorCode["FFmpegPttTransError"] = -220] = "FFmpegPttTransError";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
const ErrorMessage = {
    [ErrorCode.UserNotExists]: "查无此人",
    [ErrorCode.GroupNotJoined]: "未加入的群",
    [ErrorCode.MemberNotExists]: "幽灵群员",
    [ErrorCode.RiskMessageError]: "群消息发送失败，可能被风控",
    [ErrorCode.SensitiveWordsError]: "群消息发送失败，请检查消息内容",
    10: "消息过长",
    34: "消息过长",
    120: "在该群被禁言",
    121: "AT全体剩余次数不足"
};
function drop(code, message) {
    if (!message || !message.length)
        message = ErrorMessage[code];
    throw new core_1.ApiRejection(code, message);
}
exports.drop = drop;
/** 不在内的都属于未知错误，暂时无法解决 */
var LoginErrorCode;
(function (LoginErrorCode) {
    LoginErrorCode[LoginErrorCode["WrongPassword"] = 1] = "WrongPassword";
    LoginErrorCode[LoginErrorCode["AccountFrozen"] = 40] = "AccountFrozen";
    LoginErrorCode[LoginErrorCode["TooManySms"] = 162] = "TooManySms";
    LoginErrorCode[LoginErrorCode["WrongSmsCode"] = 163] = "WrongSmsCode";
    LoginErrorCode[LoginErrorCode["WrongTicket"] = 237] = "WrongTicket";
})(LoginErrorCode = exports.LoginErrorCode || (exports.LoginErrorCode = {}));
