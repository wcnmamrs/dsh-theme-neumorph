# DSH 新拟态主题 (dsh-theme-neumorph)

给 Harness 网页界面换上一层**新拟态**（neumorphism / soft UI）皮肤：冷灰表面、钢蓝强调色、柔和的单向与双向软阴影，浅色与深色模式同时生效。

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

- 宿主的类名是 CSS Module 的 `<hash>_<local>` 形式，规则按整类名锚定（如 `[class$="_card"]`），不会误伤卡片内部的零件。
- 插件的界面用自己的命名（`dshwv-*`、BEM 之类），不被命中。
- 没有一条规则按裸标签生效：`span` 不被当成文字，`button` 不被当成按钮。

## 目录结构

```
neumorph-theme/
├── package.json        # bundle 清单: dsh.bundle.patch + dsh.client
├── cordis.patch.yml    # 把本插件 insert 进 profile 的 Loader 树
├── index.js            # Host 半: 空实现,只作为 bundle 的一行存在
├── client.js           # Client 半: token 覆盖 + 阴影样式表
├── locale/{zh,en}.json # 插件列表里的标题与描述
└── icon.svg            # 原创图标
```

## 实现要点

- Client 半通过 `window.__ModuleLoader__.load({ id, factory })` 注册，`factory` 返回 `{ inject: ['theme'], apply(ctx) }`。
- 所有副作用都包在 `ctx.effect()` 里并返回清理函数，插件停用时撤销 token 覆盖层并移除样式表，界面立刻回到原生外观。
- 若宿主某天拒绝含 `--dsw-radius-*` 的 token 表，会自动退回只含颜色的 58 项重试。
- 样式规则用整类名锚定宿主 CSS Module，哈希前缀随版本变化也不会失效。

## 许可

MIT
