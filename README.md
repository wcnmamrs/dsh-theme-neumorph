# DSH 新拟态主题 (dsh-theme-neumorph)

[![CI](https://github.com/wcnmamrs/dsh-theme-neumorph/actions/workflows/ci.yml/badge.svg)](https://github.com/wcnmamrs/dsh-theme-neumorph/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-theme-neumorph.svg)](https://www.npmjs.com/package/dsh-theme-neumorph)
[![license](https://img.shields.io/npm/l/dsh-theme-neumorph.svg)](LICENSE)

给 Harness 网页界面换上一层**新拟态**（neumorphism / soft UI）皮肤：冷灰表面、钢蓝强调色、柔和的单向与双向软阴影，浅色与深色模式同时生效。

## 截图

深色模式（浅色模式同一套配色，换成 `#e0e5ec` 冷灰底）：

| 首页与输入区 | 侧栏与会话列表 |
| --- | --- |
| ![首页](https://raw.githubusercontent.com/wcnmamrs/dsh-theme-neumorph/main/assets/screenshot-1.jpg) | ![侧栏](https://raw.githubusercontent.com/wcnmamrs/dsh-theme-neumorph/main/assets/screenshot-2.jpg) |

## 它做了什么

主题由两层组成，彼此独立、都可回退：

| 层 | 手段 | 作用 |
| --- | --- | --- |
| 颜色层 | `ctx.theme.overrideTokens()` | 覆盖 72 个 `--dsw-*` 颜色与圆角 token：表面、按钮填充、代码面板、浮动层、边框、文字、品牌色、状态色、圆角刻度 |
| 阴影层 | 注入一张 `<style>` | 新拟态必须靠成对的软阴影表达，而 token 只能装颜色，所以阴影单独成表 |

配色基线：

- 冷灰 `#e0e5ec` 系表面，钢蓝 `#4a6b8a` 强调（深色模式自动切换为 `#262b31` / `#7ea6c9`）
- 高光 `rgba(163,177,198,.6)` 与暗部 `#ffffff` 组成双缘阴影；深色模式改用低透明度白光与深黑

浮雕只落在四处：卡片柔和投影、输入区内凹、输入区大板与菜单/对话框的双向浮雕、侧栏沟槽。整宽、背景透明的控件（列表行、菜单项、分段控件）不带投影——它们一旦带投影，会在圆角之外画出一条“幻影边线”，看起来像多余的边框。

## 边界

主题只动宿主自己画的界面，不碰第三方插件：

- 宿主同时用着**两套** CSS Module 命名：预构建样式表是 `_<local>_<hash>_<line>`（`_card_7gxqk_107`），组件从 JS 注入的样式是 `<hash>_<local>`（`wSkVaW_card`）。所以一个类名要同时锚定两次——`[class$="_card"]` 与 `[class*="_card_"]`——只写一种就会有一半界面纹丝不动。
- 凡是要**加**规则的地方，锚定的都是**完整的 local 名**，而且一定用下划线夹住（`[class*="_card_"]` 而不是 `[class*="_card"]`），否则会串到 `_cardContent_x_y`、`_labelChip` 这种更长的零件上，卡片的每一块又各得一层投影。只有**排除**项才允许宽泛的片段（`button:not([class*="_row"])` 这类），因为排除范围宽一点只会少上一条浮雕，不会多毁一块界面。
- 每个类名锚定都带 `:not([class*="__"])`：宿主是**单**下划线，别人家的 BEM 是**双**下划线，这一条挡住的正是 `panel__card`。
- 裸标签只出现在三处：宿主的表单与代码面（`textarea`、`input`、`select`、`pre`）、可编辑文本（`[contenteditable="true"]`），以及必须同时带宿主类名的控件（`button` / `[role="button"]` / `a` + `[class*="_"]`）。`span` 不被当成文字。
- 不强制按钮底色。主题里所有表面是同一个颜色，透明按钮本来就与表面齐平；而宿主有些控件是**功能填充**（附件删除键的圆盘用 `--dsw-alias-button-contrast-fill`、叉号用 `--dsw-alias-label-primary-inverted`），一旦被灌成表面色，叉号就在近白底上消失了。所以按钮只加圆角与浮雕，填充留给宿主。
- 文本会被拍平，但表单控件不会：宿主的重命名输入框类名就叫 `ymsBma_name`，它在文字规则里必须被 `:not(input):not(textarea):not(select)` 放行，否则那块输入框看起来就是一行纯文本。
- 不是每个 token 都是"板子"。引用竖线（`--dsw-alias-markdown-citation`）、幽灵按钮的选中态（`--dsw-alias-button-ghost-active-fill`）、行内代码（`--dsw-alias-markdown-inline-code`）是宿主的**信号**，置成 `transparent` 等于把它们删掉，所以它们保留一层浅色，而不是跟其他表面一起消失。
- 文本框的焦点指示不用宿主的外扩轮廓（在软表面上像一圈多余的蓝边），改成画在框内侧的 1.5px 钢蓝内缘；`outline-offset: -2px` 与内凹阴影叠加而不是替换它。checkbox / radio / 原生控件完全不碰，宿主自己的焦点环留给它们。

## 目录结构

```
.
├── package.json           # bundle 清单: dsh.bundle.patch + dsh.client
├── cordis.patch.yml       # 把本插件 insert 进 profile 的 Loader 树
├── index.js               # Host 半: 空实现,只作为 bundle 的一行存在
├── client.js              # Client 半: token 覆盖 + 阴影样式表
├── locale/{zh,en}.json    # 插件列表里的标题与描述
├── icon.svg               # 原创图标
├── test/                  # 不依赖浏览器的断言
│   ├── harness.mjs        #   按 __ModuleLoader__ 契约加载 client.js
│   └── theme.test.mjs     #   调色板 / 样式表结构 / 卸载路径
├── scripts/
│   └── verify-manifest.mjs # 清单与打包自检
└── .github/workflows/ci.yml
```

## 实现要点

- Client 半通过 `window.__ModuleLoader__.load({ id, factory })` 注册，`factory` 返回 `{ inject: ['theme'], apply(ctx) }`。
- 所有副作用都包在 `ctx.effect()` 里并返回清理函数：样式表在 effect 内插入（effect 被拒就一张纸都不留），重复 apply 时先删掉自己上一张，停用时先移除样式表再撤销 token 覆盖层，界面立刻回到原生外观。
- 若宿主某天拒绝含 `--dsw-radius-*` 的 token 表，会退回只含颜色的 66 项重试一次；连重试也被拒时保留阴影层并告警，而不是把主题整个掀掉。这是一条防御路径——目前这版宿主只校验 token 值的形状（是否 `{ light, dark }`），不校验名字，所以实际上不会走到。
- 颜色层之外的一切都用宿主类名锚定 CSS Module，哈希前缀与文件名随版本变化都不会失效；只有上面那几个裸标签例外。

## 开发

不需要浏览器，也不需要安装依赖（`node --test` 自带）：

```bash
npm test                    # 19 项断言：调色板、样式表结构、生命周期、卸载路径
npm run check               # 语法检查
node scripts/verify-manifest.mjs   # 清单/打包自检
npm run verify              # 以上全部
```

测试用一个假的 `window.__ModuleLoader__` 与 `document` 载入 `client.js`，因此断言的正是宿主实际调用的那条路径。这个假 `document` 会记录"谁在什么时机被插进哪个根"，所以下面这些都能测出来：

- 样式表没有按裸标签生效（`span` 不被当成文字），
- 没有第三方插件命名（曾经把 `dshwv-*` 的图标清空），
- 类名锚定必须用下划线夹住，且每个 local 的两套命名都在（只写一套是曾经踩过的坑：一半界面没有浮雕），
- 每个锚定都带 BEM 护栏；排除项不算，
- 焦点环存在、画在框内、不吞掉内凹阴影、不碰 checkbox / radio，且全文没有一处 `outline: none`，
- 样式表在 `ctx.effect` 内插入：宿主拒绝注册 effect 时一张纸都不留，
- 连续 apply 两次只留下一张样式表，
- 浮雕落在卡片、输入区大板、菜单/对话框与会话行上，且各用各的阴影级；按钮、输入框、悬停态、发送胶囊各自保着圆角与阴影（只断言"字符串出现过"就够，因为这里保护的是"规则还在"），
- 没有任何按钮规则会强制底色（附件删除键上的叉号就是这样变成隐形的），且对比度圆盘还留着自己的填充，
- 信号类 token 不会被置成 `transparent`（引用竖线、幽灵按钮选中态、行内代码），
- 宿主拒绝插入样式表时，那张表会被撤回、异常照旧抛出。

## 许可

MIT
