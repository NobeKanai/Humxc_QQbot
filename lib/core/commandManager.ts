/**
 * 用于支持命令, 基于keywordManager实现
 */

type CommandFunc = (...args: any) => any;
type CommandCallback = (result: ReturnType<CommandFunc>, err: Error) => any;
/** 命令类型 */
type Command = {
    /**
     * 命令开始字符
     * 检测到消息开头为此字符时则视为触发命令
     * 即"这条消息是一条命令"
     */
    startStr: string[];
    /**
     * 参数分割符
     * 在消息中使用此参数来分割为参数
     */
    splitStr: string[];
    /**
     * 命令主体
     * 在满足"这条消息是一条命令"的情况下开始匹配此字符以识别命令
     */
    command: string;
    /**
     * 触发命令后执行的函数
     */
    func: CommandFunc;
    /**
     * 命令运行完成后的回调函数,将传递func函数的返回值和func的错误(如果有)
     */
    callback: CommandCallback;
};
