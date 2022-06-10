export default {
    // 通用配置，包含了 oicq 的配置
    // oicq 配置项: https://github.com/takayama-lily/oicq/blob/main/lib/client.ts#L617
    oicq: {
        //1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad
        platform: 3,
        log_level: "info",
    },
    id: -1,
    admins: Array<number>(),
};
