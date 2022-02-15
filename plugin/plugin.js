pluginConfig = {
  /** 触发方式： "EVENT"(事件) | "RUNTIME"(插件被加载时运行) | "KEYWORD"(关键词) | "SETTIME"(定时) */
  /** 只允许在area为"GLOBAL"时使用"EVENT"，否则不会被加载 */
  /** 
   触发事件(_event): 支持oicq库的事件，详细内容查看oicq/lib/events.d.ts
   好友申请: "friend"
   群申请: "group"
   通知: "notice"
   消息撤回: "recall"
   戳一戳: "poke"
   收到二维码: "system.login.qrcode"
   收到滑动验证码: "system.login.slider"
   设备锁验证事件: "system.login.device"
   登录遇到错误: "system.login.error"
   上线事件: "system.online"
   下线事件（网络原因，默认自动重连）: "system.offline.network"
   下线事件（服务器踢）: "system.offline.kickoff"
   好友申请: "request.friend.add"
   对方已将你加为单向好友，可回添对方: "request.friend.single"
   加群申请: "request.group.add"
   群邀请: "request.group.invite"
   所有request: "request"
   所有私聊消息: "message.private"
   从好友: "message.private.friend"
   从群临时会话: "message.private.group"
   从其他途径: "message.private.other"
   从我的设备: "message.private.self"
   所有群消息: "message.group"
   普通群消息: "message.group.normal"
   匿名群消息: "message.group.anonymous"
   讨论组消息: "message.discuss"
   所有消息: "message"
   新增好友事件: "notice.friend.increase"
   好友(被)删除事件: "notice.friend.decrease"
   好友消息撤回事件: "notice.friend.recall"
   好友戳一戳事件: "notice.friend.poke"
   入群・群员增加事件: "notice.group.increase"
   踢群・退群事件: "notice.group.decrease"
   群消息撤回事件: "notice.group.recall"
   管理员变更事件: "notice.group.admin"
   群禁言事件: "notice.group.ban"
   群转让事件: "notice.group.transfer"
   群戳一戳事件: "notice.group.poke"
   所有好友notice事件: "notice.friend"
   所有群notice事件: "notice.group"
   所有notice事件: "notice"
   私聊同步: "sync.message"
   消息已读同步: "sync.read.private"
   隐藏事件: 监听所有收到的包: "internal.sso"
   隐藏事件: 对方正在输入: "internal.input"  _event
   */
  trigger: "EVENT",
  _event: "message",
  /** 满足上述设置的条件时，便会运行run函数 */
  run: (e) => {
    console.log("收到了一条消息:" + e.message);
  },
};
module.exports = class plugin {
  /** 插件名称 */
  pluginName = "testPlugin";
  /** 机器人版本 */
  botVersion = "0.0.1";
  /** 插件版本 */
  pluginVersion = "1.0.0";
  /** 描述插件的一些信息 */
  info = "这是用来测试的插件";
  /** 配置信息,用数组来存储多个配置 */
  config = [pluginConfig];
  /** 插件运行时数据隔离: "GLOBAL"(全局) "PRIVATE"(私聊) "GROUP"(群聊) */
  area = "GLOBAL";
};
