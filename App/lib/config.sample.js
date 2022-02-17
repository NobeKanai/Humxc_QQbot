"use strict";
// 此文件必须名为config.js才能生效哦
module.exports = {
    //通用配置
    general: {
        //1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad
        platform: 3,
        log_level: "debug",
        //日志出现错误时发送给管理员
        error_call_admin: "true",
        //是否将日志输出到文件
        save_log_file: "false",
    },
    //每个账号的单独配置(用于覆盖通用配置)
    // 147258369: {
    // },
    //机器人的QQ号
    这里填QQ号: {
        //机器人账户的密码，如果不设置或留空将启动扫码登录
        password: "",
        //管理员账户
        admin: [],
        //插件列表(string[]类型,plugin文件夹内js文件的名称)仅输入"ALL"将加载所有插件，留空则不添加插件
        plugin_list: ["ALL"],
    },
};
