# QQbot

当前仓库正在开发的初级阶段，有许多不稳定因素，也没有什么功能。

使用的协议库 [oicq](https://github.com/takayama-lily/oicq)。

这是一个正在重构的 QQ 机器人，缓慢迭代中。基于此仓库的 old 分支。

old 分支是我自己在使用的机器人，初衷用于练习编程，顺带也能解决自己的需求。但是由于代码质量的问题，日后想要维护就是雪上加霜，于是乎想要重构。基于先前的经验，打算重新设计。

这个机器人的目标是插件化，插件开发应当非常舒服，不应该去过多考虑机器人客户端这边的事。

## 编译过程

-   克隆当前仓库:

    ```bash
    git clone https://github.com/HumXC/QQbot
    ```

-   初始化项目引用的包

    ```bash
     cd QQbot
     yarn install
    ```

-   编译 typescript

    ```bash
     tsc
    ```

-   运行机器人

    执行 tsc 编译之后会在 App 目录下生成可直接通过 nodejs 运行的 js 代码

    ```bash
     cd App
     node QQbot.js
    ```
