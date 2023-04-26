import { GroupMessageEvent } from "icqq";

export type GroupCommandMatcher = (e: GroupMessageEvent) => boolean;
export type GroupCommandCallback = (e: GroupMessageEvent) => Promise<void>;

export interface GroupCommandHandler {
    matcher: GroupCommandMatcher;
    callback: GroupCommandCallback;
}

export function groupCommandMatcherFromText(
    cmd: string | ((text: string) => boolean),
): GroupCommandMatcher {
    if (typeof cmd === "string") {
        return (e) => cmd === e.raw_message;
    } else {
        return (e) => cmd(e.raw_message);
    }
}

export function groupCommandMatcherFromRegex(exp: RegExp | string): GroupCommandMatcher {
    let _exp: RegExp;
    if (typeof exp === "string") {
        if (!exp.startsWith("^")) exp = "^".concat(exp);
        if (!exp.endsWith("$")) exp = exp.concat("$");
        _exp = new RegExp(exp);
    } else {
        _exp = exp;
    }
    return groupCommandMatcherFromText(
        (text) => {
            return _exp.test(text);
        },
    );
}
