"use strict";
// 此文件必须名为config.js才能生效哦

module.exports = {
  //oicq客户端的配置
  oicqConfig: {
    //通用配置
    general: {
      platform: 5, //1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad
    },

    //每个账号的单独配置(用于覆盖通用配置)
    // 147258369: {
    // },
  },
  botConfigs: [
    {
      //机器人的QQ号
      account: 1124922489,
      //管理员账户
      admin: [2928607724],
      //插件列表(string[]类型,plugin文件夹内js文件的名称)仅输入"ALL"将加载所有插件，留空则不添加插件
      pluginList: ["ALL"],
    },
    //多个QQ号就在这个数组里添加多个配置
  ],
};
