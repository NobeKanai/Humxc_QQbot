/** 不包括服务器返回的其他具体错误 */
export declare enum ErrorCode {
    ClientNotOnline = -1,
    /** 发包超时未收到服务器回应 */
    PacketTimeout = -2,
    UserNotExists = -10,
    GroupNotJoined = -20,
    MemberNotExists = -30,
    /** 传入的消息参数不正确 */
    MessageBuilderError = -60,
    /** 群消息被风控 */
    RiskMessageError = -70,
    /** 群消息有敏感词发送失败 */
    SensitiveWordsError = -80,
    HighwayTimeout = -110,
    HighwayNetworkError = -120,
    NoUploadChannel = -130,
    OfflineFileNotExists = -160,
    FFmpegVideoThumbError = -210,
    FFmpegPttTransError = -220
}
export declare function drop(code: number, message?: string): never;
/** 不在内的都属于未知错误，暂时无法解决 */
export declare enum LoginErrorCode {
    WrongPassword = 1,
    AccountFrozen = 40,
    TooManySms = 162,
    WrongSmsCode = 163,
    WrongTicket = 237
}
