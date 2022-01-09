/// <reference types="node" />
import { FileElem } from "./message";
declare type Client = import("./client").Client;
/** 共通属性 */
export interface GfsBaseStat {
    /** 文件或目录的id (目录以/开头) */
    fid: string;
    /** 父目录id */
    pid: string;
    name: string;
    user_id: number;
    create_time: number;
    is_dir: boolean;
}
/** 文件属性 */
export interface GfsFileStat extends GfsBaseStat {
    size: number;
    busid: number;
    md5: string;
    sha1: string;
    duration: number;
    download_times: number;
}
/** 目录属性 */
export interface GfsDirStat extends GfsBaseStat {
    file_count: number;
}
/** 群文件系统 */
export declare class Gfs {
    private readonly c;
    readonly gid: number;
    /** `this.gid`的别名 */
    get group_id(): number;
    /** 返回所在群的实例 */
    get group(): import("./group").Group;
    /** 返回所属的客户端对象 */
    get client(): import("./client").Client;
    constructor(c: Client, gid: number);
    /** 获取使用空间和文件数 */
    df(): Promise<{
        total: any;
        used: any;
        free: number;
    } & {
        file_count: any;
        max_file_count: any;
    }>;
    private _resolve;
    /** 获取文件或目录属性 */
    stat(fid: string): Promise<GfsFileStat | GfsDirStat>;
    /** 列出目录下的所有文件和目录(根目录pid为`/`) */
    dir(pid?: string, start?: number, limit?: number): Promise<(GfsFileStat | GfsDirStat)[]>;
    /** `this.dir`的别名 */
    ls(pid?: string, start?: number, limit?: number): Promise<(GfsFileStat | GfsDirStat)[]>;
    /** 创建目录(只能在根目录下创建) */
    mkdir(name: string): Promise<GfsDirStat>;
    /** 删除文件或目录(删除目录会删除下面的所有文件) */
    rm(fid: string): Promise<void>;
    /** 重命名文件或目录 */
    rename(fid: string, name: string): Promise<void>;
    /** 移动文件(所有目录必须在根目录下，因此无法移动目录) */
    mv(fid: string, pid: string): Promise<void>;
    private _feed;
    /** 上传一个文件 */
    upload(file: string | Buffer, pid?: string, name?: string, callback?: (percentage: string) => void): Promise<GfsFileStat>;
    /** 获取文件下载地址 */
    download(fid: string): Promise<Omit<FileElem, "type"> & {
        url: string;
    }>;
}
export {};
