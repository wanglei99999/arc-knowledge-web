---
version: alpha
name: 特藏调阅台 (Reading Room Desk)
description: ArcKnowledge 的界面是一张特藏阅览室的调阅台。桌面是素的——中性白的无酸纸、石墨铅笔、细如发丝的格线。整台桌子上唯一的色相是朱红，一屏只钤一枚：标出这条回答的依据落在哪里。相似度用长度表达，排名升降用符号表达，都不用色相。界面让位给内容，因为这里的内容——文档、召回、引证——才是被调阅的藏品。

colors:
  # 主色即铅笔。显式声明是为了堵住一个洞：缺 primary 时 agent 会自行编一个，
  # 多半编出个蓝色。
  primary: '#1C1C1E'

  # 纸与桌。相邻档 >=1.08，够分辨 hover 与选中
  paper: '#FCFCFC'
  desk: '#F1F1F3'
  desk-hover: '#E8E8EC'
  desk-sunken: '#DEDEE3'

  # 石墨。白底上可读的文字档最多三档（每档需 >=4.5:1），这是物理上限，
  # 不是取值问题。三级与二级只差 1.35:1 —— 层级由字号字重承担，明度只是辅助。
  graphite: '#1C1C1E'      # 16.58 / 15.08（纸 / 桌板）
  graphite-70: '#5B5B61'   #  6.57 / 5.98
  graphite-45: '#6C6C73'   #  5.08 / 4.62 —— 已是两面都过 AA 的最浅值，不可再调浅
  graphite-25: '#B8B8BE'   #  1.92 —— 不承载文字，只做禁用与装饰线

  # 格线
  rule: '#E4E4E7'
  rule-strong: '#D6D6DA'

  # 钤印：只标"依据"。它是描线的印，永不填底
  # 6.14（纸）/ 5.14（印泥底）—— 两面都过 AA
  seal: '#B03227'
  seal-pale: '#F7E4E1'

  # 类型色：只用于类型识别的图标与状态点。全部 >=3:1，两两色相间距 >=40°
  accent-blue: '#1F5FA9'
  accent-violet: '#6B3D9E'
  accent-green: '#3F6B4C'
  accent-amber: '#7A5718'

  # 失败：唯一允许填底的色块。与钤印同为红族，靠"填不填底"区分，不靠色相
  alert-fill: '#FBE9E6'
  alert-ink: '#7A2A20'

  # 焦点环：石墨。>=3:1 且不消耗任何色相
  focus: '#1C1C1E'

typography:
  display:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.01em
  title-lg:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
  title:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: 'IBM Plex Sans, IBM Plex Sans SC, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  callnum:
    fontFamily: 'IBM Plex Mono, ui-monospace, monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  callnum-sm:
    fontFamily: 'IBM Plex Mono, ui-monospace, monospace'
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px

elevation:
  flat: 'none'
  overlay: '0 4px 16px rgba(0,0,0,0.08)'

measure:
  prose: 640px
  hairline: 1px
  icon-stroke: 1.5px

motion:
  duration-hover: 120ms
  duration-standard: 180ms
  duration-overlay: 220ms
  duration-progress: 1400ms
  easing-settle: 'cubic-bezier(0.2, 0, 0, 1)'
  easing-exit: 'cubic-bezier(0.4, 0, 1, 1)'
  travel: 3px
  press-scale: 0.96

components:
  # --- 基础件 ---
  focus-ring:
    backgroundColor: transparent
    textColor: '{colors.focus}'
    size: 2px
  icon-button:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    rounded: '{rounded.sm}'
    size: 28px
  icon-button-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    size: 28px
  icon-button-disabled:
    backgroundColor: transparent
    textColor: '{colors.graphite-25}'
    rounded: '{rounded.sm}'
    size: 28px
  select-trigger:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: 4px 8px
    height: 28px
  select-trigger-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
  disclosure-toggle:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.meta}'
    rounded: '{rounded.sm}'
    padding: 4px 8px
  list-empty:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.meta}'
    padding: 4px 8px
  placeholder:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.body}'
  skeleton:
    backgroundColor: '{colors.desk-hover}'
    rounded: '{rounded.xs}'
    height: 12px
  progress-track:
    backgroundColor: '{colors.desk-sunken}'
    rounded: '{rounded.full}'
    height: 2px
  progress-fill:
    backgroundColor: '{colors.graphite-70}'
    rounded: '{rounded.full}'
    height: 2px
  tooltip:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.paper}'
    typography: '{typography.meta}'
    rounded: '{rounded.sm}'
    padding: 4px 8px
  kbd:
    backgroundColor: '{colors.desk}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite-70}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 1px 5px

  # --- 侧栏 ---
  sidebar:
    backgroundColor: '{colors.desk}'
    width: 260px
  sidebar-brand:
    backgroundColor: transparent
    textColor: '{colors.graphite}'
    typography: '{typography.title}'
    padding: 12px 8px
  sidebar-group-label:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.meta}'
    padding: 6px 8px
  sidebar-footer:
    backgroundColor: '{colors.desk}'
    padding: 8px
  sidebar-item:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: 6px 8px
    height: 32px
  sidebar-item-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
  sidebar-item-active:
    backgroundColor: '{colors.desk-sunken}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
  session-row:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.meta}'
    rounded: '{rounded.sm}'
    padding: 5px 8px
  composer:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 12px
  composer-focused:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.graphite-25}'
    textColor: '{colors.graphite}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 12px
  composer-context-chip:
    backgroundColor: '{colors.desk}'
    textColor: '{colors.graphite-70}'
    typography: '{typography.callnum}'
    rounded: '{rounded.md}'
    padding: 6px 10px
  composer-send:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.paper}'
    rounded: '{rounded.full}'
    size: 28px
  citation-card:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 12px
  citation-card-key:
    backgroundColor: '{colors.seal-pale}'
    textColor: '{colors.graphite}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 12px
  # 印是有字的。纯几何的小方块在 12px 上读作复选框——见 Do's and Don'ts
  seal-mark:
    backgroundColor: transparent
    borderColor: '{colors.seal}'
    textColor: '{colors.seal}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 1px 5px
  citation-source:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    typography: '{typography.callnum-sm}'
  score-readout:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    typography: '{typography.callnum}'
  score-bar-track:
    backgroundColor: '{colors.desk-sunken}'
    rounded: '{rounded.full}'
    height: 3px
    width: 48px
  score-bar-fill:
    backgroundColor: '{colors.graphite-70}'
    rounded: '{rounded.full}'
    height: 3px
  chunk-row:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite-70}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: 10px 12px
  message-user:
    backgroundColor: '{colors.desk}'
    textColor: '{colors.graphite}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 10px 14px
  message-assistant:
    backgroundColor: transparent
    textColor: '{colors.graphite}'
    typography: '{typography.body}'
  intent-card:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    padding: 14px
  intent-card-hover:
    backgroundColor: '{colors.desk}'
    borderColor: '{colors.rule-strong}'
    rounded: '{rounded.lg}'
  intent-card-icon-explore:
    backgroundColor: transparent
    textColor: '{colors.accent-blue}'
    size: 18px
  intent-card-icon-build:
    backgroundColor: transparent
    textColor: '{colors.accent-violet}'
    size: 18px
  intent-card-icon-review:
    backgroundColor: transparent
    textColor: '{colors.accent-green}'
    size: 18px
  intent-card-icon-fix:
    backgroundColor: transparent
    textColor: '{colors.accent-amber}'
    size: 18px
  button-primary:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.paper}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: 7px 14px
    height: 32px
  button-primary-hover:
    backgroundColor: '{colors.graphite-70}'
    textColor: '{colors.paper}'
    rounded: '{rounded.sm}'
    height: 32px
  button-primary-disabled:
    backgroundColor: '{colors.desk-sunken}'
    textColor: '{colors.graphite-45}'
    rounded: '{rounded.sm}'
    height: 32px
  button-primary-loading:
    backgroundColor: '{colors.graphite-70}'
    textColor: '{colors.paper}'
    rounded: '{rounded.sm}'
    height: 32px
  button-secondary:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  button-secondary-hover:
    backgroundColor: '{colors.desk}'
    borderColor: '{colors.graphite-25}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    height: 32px
  button-secondary-disabled:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite-25}'
    rounded: '{rounded.sm}'
    height: 32px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.graphite-70}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  button-ghost-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    height: 32px
  text-input:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    height: 32px
    padding: 6px 10px
  text-input-focused:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.graphite}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    height: 32px
  text-input-error:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.alert-ink}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    height: 32px
  text-input-disabled:
    backgroundColor: '{colors.desk}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite-45}'
    rounded: '{rounded.md}'
    height: 32px
  field-error-text:
    backgroundColor: transparent
    textColor: '{colors.alert-ink}'
    typography: '{typography.meta}'
  status-tag:
    backgroundColor: transparent
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite-70}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 2px 6px
  status-tag-progress:
    backgroundColor: transparent
    borderColor: '{colors.rule}'
    textColor: '{colors.accent-amber}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 2px 6px
  status-tag-ok:
    backgroundColor: transparent
    borderColor: '{colors.rule}'
    textColor: '{colors.accent-green}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 2px 6px
  status-tag-warn:
    backgroundColor: transparent
    borderColor: '{colors.rule}'
    textColor: '{colors.accent-amber}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 2px 6px
  status-tag-alert:
    backgroundColor: '{colors.alert-fill}'
    borderColor: '{colors.alert-ink}'
    textColor: '{colors.alert-ink}'
    typography: '{typography.callnum-sm}'
    rounded: '{rounded.xs}'
    padding: 2px 6px
  table-header:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite-70}'
    typography: '{typography.meta}'
    height: 32px
  table-row:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule}'
    textColor: '{colors.graphite}'
    typography: '{typography.body-sm}'
    height: 40px
  table-row-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    height: 40px
  table-row-selected:
    backgroundColor: '{colors.desk-sunken}'
    textColor: '{colors.graphite}'
    height: 40px
  checkbox:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.graphite-25}'
    rounded: '{rounded.xs}'
    size: 14px
  checkbox-checked:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.paper}'
    rounded: '{rounded.xs}'
    size: 14px
  tab:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: 6px 10px
  tab-active:
    backgroundColor: '{colors.desk-sunken}'
    textColor: '{colors.graphite}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: 6px 10px
  menu:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    padding: 4px
  menu-item:
    backgroundColor: transparent
    textColor: '{colors.graphite}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: 6px 8px
    height: 30px
  menu-item-hover:
    backgroundColor: '{colors.desk-hover}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    height: 30px
  dialog:
    backgroundColor: '{colors.paper}'
    borderColor: '{colors.rule-strong}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.lg}'
    padding: 20px
  dialog-scrim:
    backgroundColor: '#1C1C1E26'
  toast:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.paper}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 10px 14px
  empty-state:
    backgroundColor: transparent
    textColor: '{colors.graphite-45}'
    typography: '{typography.display}'
---

# ArcKnowledge DESIGN.md

> **覆盖范围**：本文件覆盖智能问答、检索调试、文档管理三面的通用词汇，以及全局基础件。**管理配置面的表单控件（select / toggle / radio / slider）与图表配色尚未定义，不得从本文件外推。** 遇到未定义的东西：先在此补 token，再写代码。别从 Tailwind 默认里拿——那里是蓝的。
>
> **本系统无暗色模式。** 参照是一间开着灯的阅览室，纸不会变黑。夜间需求用系统级降亮度解决，不要发明一套暗色 token。

## Brand & Style

ArcKnowledge 的界面是**一间特藏阅览室的调阅台**。

不是阅览室本身，是那张桌子。使用者是内部的工程师和知识工作者，他们坐下来是为了**核查**：这条回答的依据是什么、召回了哪些段落、分数多少、rerank 之后谁上来了谁下去了。他们不是来被款待的，是来干活的。

调阅台的气质是：素、密、准。桌面是中性白的无酸纸和一层比纸暗一格的桌板，字是石墨铅笔写的，分隔靠发丝般的格线。桌上没有装饰，因为桌子不该比桌上的东西更抢眼——**被调阅的藏品才是主角**：文档、召回、引证。

颜色是稀缺的，且**只花在需要判断的地方**。

判据只有一条：**要给一个东西上色，先问用户此刻是不是在判断它。** 标识不需要颜色——文档名扫一眼就认得。需要颜色的是**判断**：这条是不是依据、这批召回质量如何、这份文档进到哪一步了、这四个动作分别是什么。

由此得到颜色的三层预算，越往下越窄：

1. **朱红是签名**，一屏只钤一枚：标出这条回答的依据落在哪里。它是钤印——描线的，永不填底。**注意它不给出处**：一次召回有四五条出处，四五个文件名全标红，红就不再是签名，而是背景噪音了。文件名是用来认的，认就用石墨——这是上面那条判据的直接推论，别再推翻它。
2. **类型色**（蓝/紫/绿/琥珀）只给**类型识别**：意图图标、状态点。仅上 ≥16px 的图形，绝不上面、按钮、正文、边框。
3. **失败允许填底**，是全系统唯一的色块。它与钤印同属红族，靠"填不填底"区分，不靠色相——**印是钤上去的，退单是整张纸都不一样**。

其余一切是石墨。

## Colors

石墨承担全部信息，颜色只承担判断。

- **Primary** {colors.primary} **就是石墨本身**。主按钮、发送键都是石墨实心的。显式写出来是为了堵一个洞：`primary` 缺席时 agent 会自行编一个主色，多半是蓝。**主色即铅笔。**
- **Paper** {colors.paper} 是主区画布。**中性白，不是米白。** 无酸纸是中性白的；纸泛黄是酸化劣化的征兆，那是藏品出了问题，不是年代感。任何往奶油、米、暖调偏的画布，都是在模仿一张正在坏掉的纸。
- **Desk / desk-hover / desk-sunken** {colors.desk} {colors.desk-hover} {colors.desk-sunken} 是桌板与它的两级压深。相邻各差 ≈1.09——**这是刻意拉开的**：hover 与选中若差不到一格，用户就分不出"手在上面"和"已经选中"。
- **Graphite** {colors.graphite} 是铅笔，微冷的近黑——纯黑是印刷油墨，不是铅笔。
- **Graphite 70 / 45** {colors.graphite-70} {colors.graphite-45} 是次级与三级文字。**白底上可读的文字档最多三档**（每档需 ≥4.5:1），这是物理上限，不是取值问题。而且三级必须在**桌板上**也可读（会话行在侧栏里），这把它顶到了 {colors.graphite-45} —— 已是两面都过 AA 的最浅值。它与二级只差 1.29:1：**层级由字号和字重承担，明度只是辅助。** 不要指望靠调灰做出第四级，也不要为了"更有层次"把它调浅——那会让侧栏的会话历史掉出 AA。
- {colors.graphite-25} 不承载任何需要读的文字，只做禁用态与装饰线。禁用文字按 WCAG SC 1.4.3 免除对比度要求（失效控件属"辅助性"内容），这是有意的豁免，不是漏算。
- **Rule / rule-strong** {colors.rule} {colors.rule-strong} 是发丝格线与"可抓住"的边界（输入框、浮层外沿）。
- **Seal** {colors.seal} 是朱红藏书印，签名色。**整个系统只有一处用它**：{components.seal-mark}，标出这条回答的依据。一屏一枚。**它永远是描线的，永不填底。** 不上按钮，不上导航，不上出处，不上图表装饰。纸上 6.14:1，印泥底上 5.14:1，两面都过 AA。
- **Seal pale** {colors.seal-pale} 是印泥洇开的浅底，只用在 {components.citation-card-key}——"这一条正是答案的依据"那一张，一屏最多一处。
- **Accent blue / violet / green / amber** {colors.accent-blue} {colors.accent-violet} {colors.accent-green} {colors.accent-amber} 是类型色，只用于**类型识别**：意图卡图标、状态点。四者两两色相间距 ≥40°，全部 ≥3:1，能在 16px 下分辨。**只上图形，不上面、按钮、正文、边框。** 它们是索书标签上的色码，不是装潢。
- **Alert fill / ink** {colors.alert-fill} {colors.alert-ink} 是失败，**全系统唯一允许的色块**。一份没入库成功的文档是知识库里一个静默的洞，它不该低声说话。它与钤印同属红族，靠**填底**区分——印是钤上去的，退单是整张纸都不一样。
- **Focus** {colors.focus} 是焦点环，石墨。16.58:1，远超 SC 1.4.11 的 3:1，**且不消耗任何色相**。

## Typography

**IBM Plex** 三件套：Plex Sans 承担西文，Plex Sans SC 承担中文，Plex Mono 承担读数。选它不是因为好看，是因为它本来就是为技术文档画的字，而且三个族同源——索书号和正文并排时不会打架。

- **Display** {typography.display} 是全系统最大的字，28px。**这是刻意压低的。** 调阅台上没有大标题：它只用在空状态那一句问话上，再无别处。任何比它更大的字都意味着这张桌子开始自我表演。
- **Title lg / title** {typography.title-lg} {typography.title} 是页面标题和区块标题。层级差距靠字重和位置拉开，不靠字号——**字号的跨度小，是密度的前提**。
- **Body / body-sm** {typography.body} {typography.body-sm} 承担全部阅读内容。正文 1.65 的行高是为长段落读得下去，body-sm 用于卡片和列表这类扫读场景。
- **Label** {typography.label} 用于一切可操作的东西：侧栏项、按钮、标签页。500 字重是它和 body 唯一的区别。
- **Meta** {typography.meta} 是元数据：时间、计数、次级说明。
- **Callnum / callnum-sm** {typography.callnum} {typography.callnum-sm} 是等宽的索书号。**凡是"号码"性质的东西都归它**：文档 ID、chunk ID、相似度分数、rerank 名次、token 计数、耗时。等宽让它们上下对齐成一列可以扫读的数字——这是卡片目录的做法。

## Layout & Spacing

4px 基础网格，8px 常用节奏。**这张桌子是密的。**

- 侧栏 260px，桌板底色，无右边框——靠底色差一格与主区分开，不靠线。
- 侧栏行高 32px，内边距 {spacing.sm}。列表项之间不留空隙，靠 hover 的灰块区分——**留白留在分组之间，不留在项之间**。
- 主区正文列宽上限 {measure.prose}（640px），居中。这是中西混排的折中值：640px/14px 下西文约 85ch（略宽于 65–75ch 的理想区），中文约 45 字/行（CJK 理想 35–45 的上沿）。**一个 px 值服务不了两种脚本**，取值偏向中文，因为本产品的正文以中文为主。
- 卡片内边距 {spacing.md}，卡片之间 {spacing.sm}。
- 区块之间 {spacing.xl} 到 {spacing.xxl}。**没有 96px 那种段落节奏**——那是营销落地页在为滚动制造仪式感，调阅台上每一寸桌面都要用来放东西。

## Elevation & Depth

**桌上的东西是平放的。** 层次来自三样东西，按优先级：底色差一格、发丝格线、留白。阴影排在最后，且几乎用不上。

- **Level 0 — 桌板** {colors.desk}：侧栏、上下文条。
- **Level 1 — 纸** {colors.paper}：主区、卡片。它"高于"桌板，靠的是更亮一格和一圈 {colors.rule}，**不是靠阴影**。
- **Level 2 — 浮层**：下拉、菜单、弹窗。这是唯一真正离开桌面的东西，也是唯一允许有阴影的：`0 4px 16px rgba(0,0,0,0.08)`，配 1px {colors.rule-strong} 边。

任何在 Level 1 上加阴影的做法都是错的——那等于说这张纸浮在桌上。纸不浮。

## Shapes

圆角是有层级的，越大的东西越圆：

- {rounded.xs} 4px — 状态标签、小色块
- {rounded.sm} 6px — 侧栏项、按钮、chunk 行
- {rounded.md} 8px — 输入框、上下文 chip、引证卡
- {rounded.lg} 12px — 卡片、输入器、浮层
- {rounded.full} — 发送键这类圆形图标键

图标一律**单色描线**，1.5px 描边，与格线同源——它们是铅笔画的，不是插画。

## Components

### 钤印与读数（签名元素）

特藏阅览室有一条铁律：**原件上不许做任何标记**。不许划线，不许高亮，铅笔也不行。标记只能落在原件**之外**。

这条铁律是本系统的签名，它规定标记的**位置**，而不是给内容涂色：

- **命中的 chunk 不改内容一个像素。** 标记落在卡顶，原件之外。
- **一屏只钤一枚印。** {components.seal-mark} 是一枚描线的朱红小印，写着"依据"，前置在分数最高那一条的卡顶。**只有它是朱红的。**

  为什么不给每条出处都盖印：一次召回有四五条，四五个红文件名并排，红就成了背景噪音——"小到你必须去找它"这条自己就先破了。而且按判据，文件名是**认**它不是**判断**它。

- **印上有字。** 不要用纯几何的小方块——12px 的描线方框在列表里读作**未勾选的复选框**，这是形状自带的可供性，不是配色能救的。写"依据"两个字，歧义就没了。真的藏书印本来也是有字的。
- **不要用左边缘的竖条。** 那是被禁的形状（见 Do's and Don'ts），而且它紧贴文字、占着内容的地盘——真的夹条是探出页面外的，贴边的细条只是荧光笔的瘦版。
- **出处是石墨。** {components.citation-source} 是来源文档名与索书号，{typography.callnum-sm} 的 {colors.graphite-70}。
- **分数用长度，不用深浅。** {components.score-bar-track} + {components.score-bar-fill}：一道 48px 的石墨细条，**填充长度即分数**，旁边跟一个 {components.score-readout} 的等宽数字。

  实测 48px 下 0.87 与 0.52 一眼可分，0.71 与 0.64 分不出——**这是够的**。细条要回答的是"这批召回塌没塌"，不是"第二名比第三名高多少"，后者是旁边那个等宽数字的活。

  为什么不用石墨深浅：白底上可读的灰最多三档，而分数是 0.00–1.00 的连续量——**明度装不下它，这是算术，不是口味**。长度是无色相约束下唯一仍然准确的定量通道，而且可预注意：一列长短不齐的细条，扫一眼就知道这批召回塌没塌。

- **rerank 升降**用等宽的 ↑3 / ↓2，石墨。方向靠符号，不靠红绿。

一屏之内，朱红出现的总面积应当小到你必须去找它。找得到，但不吵。

### 调阅台侧栏

{components.sidebar} 是桌板本身，而且**全系统只有这一条**。品牌行、功能菜单、知识库、底部的设置，四层之间靠留白和一道 {colors.rule} 分开。

**不要再开第二条侧栏。** 两块桌板并排等于 500px 的灰——底色相同，中间那道 {colors.rule} 只差十几级明度，看过去是一整块。会话属于空间，空间在侧栏里，会话就嵌在空间底下，不另起一栏。

**空间是库房，会话是库房里的调阅单。** 空间行带文件夹图标，当前空间摊开它的会话，其余收起。会话行只在当前空间下出现——因为别的空间的会话根本没加载，画出来就是编的。**没有数据的地方不要画占位内容。**

{components.sidebar-item} 默认是透明的，文字 {colors.graphite-70}。hover 是 {components.sidebar-item-hover}——底色淡入 {colors.desk-hover}，**淡入，不滑动**。选中态是 {components.sidebar-item-active}——压下去的一格底色加满黑的字。**选中态不用朱红，也不用左侧竖条**——那道竖条是夹条的专用语汇，不能被导航借走。

{components.session-row} 是会话，嵌在空间底下，比导航项更轻：{typography.meta} 加 {colors.graphite-45}，缩进 {spacing.lg}。它是索书单的存根，不是抽屉。

### 调阅单（输入器）

{components.composer} 是堆叠的两层：{components.composer-context-chip} 是压在后面的那张卡，露出上边缘，用 {typography.callnum} 写当前空间——**它是调阅单的抬头，写明你要从哪个库房调东西**。输入框是压在上面的那张。

聚焦时切到 {components.composer-focused}：上层卡上浮 {motion.travel}，边框从 {colors.rule-strong} 收紧到 {colors.graphite-25}。{components.composer-send} 是石墨实心的圆键——**不是朱红的**。发送不是出处。

### 空状态

{components.empty-state} 用 {typography.display} 的一句问话，{colors.graphite-45}。下面是 {components.intent-card} 的一排意图卡，**最多四张**：默认 {colors.paper} 加 {colors.rule} 边，hover 时底色沉到 {colors.desk} 且边框收紧（{components.intent-card-hover}）。

每张卡带一枚 18px 的类型色图标——{components.intent-card-icon-explore}（探索）、{components.intent-card-icon-build}（构建）、{components.intent-card-icon-review}（审查）、{components.intent-card-icon-fix}（修复）。**这是全屏唯一的类型色出场**，也是它存在的理由：四个动作要在一眼之内被区分，而这正是"用户此刻在判断它"的定义。图标之外，卡片全是石墨和纸。

**空桌子是一张邀请函，不是一句道歉。** 文案说使用者能做什么，不说系统还没有什么。

### 状态与失败

入库管线有五类状态，不是四类：

| 类 | token | 覆盖 |
|---|---|---|
| 中性 | {components.status-tag} | 待处理、已删除 |
| 进行中 | {components.status-tag-progress} | 解析中、分片中、向量化中、删除中 |
| 成功 | {components.status-tag-ok} | 已入库 |
| 警告 | {components.status-tag-warn} | 索引过期——**需要注意但没坏**，它既不是成功也不是失败，这一类必须存在 |
| 失败 | {components.status-tag-alert} | 入库失败 |

前四类是描线的（透明底 + {colors.rule} 边）。**只有失败填底**，见 Colors。

**每个状态标签必须含文字状态名，不能只有色点。** 仅靠颜色传达状态会让色觉障碍用户完全收不到——这也正是 rerank 不用红绿的同一条理由。

失败的文案要说清楚发生了什么、怎么修，用界面的口吻，不道歉也不含糊。

### 焦点与键盘

用户是内部工程师。**工程师用键盘。**

- 每个可聚焦元素都用 {components.focus-ring}：2px {colors.focus} 描边，2px 外偏移。石墨的 16.58:1 远超 SC 1.4.11 要求的 3:1，且不消耗色相。
- **不要用 `outline: none` 而不给替代。** 焦点不可见时，键盘用户的光标凭空消失。
- 快捷键提示用 {components.kbd}。
- 交互组件七态齐全：default / hover / focus / active / disabled / loading / error。缺一态就是缺一态。

### 加载与进度

RAG 是全程异步的产品，**"正在发生"必须有词汇**。

- 内容占位用 {components.skeleton}，**不用居中的 spinner**。骨架保住布局，spinner 只是在说"等着"。
- 确定性进度（上传、入库管线）用 {components.progress-track} + {components.progress-fill}。
- 流式返回的正文不做骨架——它本来就在一个字一个字地到。

## Do's and Don'ts

- **Don't** 用 `border-left` / `border-right` 做彩色侧条（>1px）标记卡片或列表行。**这是本行业最容易被认出的 AI 痕迹，没有例外。** 标记命中用 {components.seal-mark} 前置印记。此条不接受"我的比喻不一样"式的豁免——每个用侧条的人都有一个比喻。
- **Don't** 把画布调暖成米白或奶油色。无酸纸是中性白的；泛黄是酸化劣化，不是年代感。
- **Don't** 用衬线体做大标题。这是调阅台，不是藏品。
- **Don't** 把朱红用在按钮、CTA、导航选中态或任何装饰上。印只盖在"依据"上，一屏一枚。
- **Don't** 给每条出处都上朱红。四五个红文件名并排，签名就变成了噪音。出处是石墨。
- **Don't** 用纯几何的小方块（描线方框、小圆点）做行内标记。**12px 的描线方框读作未勾选的复选框**——这是形状自带的可供性，换个颜色救不回来。标记要带字。
- **Don't** 让 Markdown 正文里的引用块、提示块填底。**全系统只有失败能填底**，这条对渲染库的默认皮肤同样有效——它们大多自带一个灰底，要显式关掉。
- **Don't** 让有序列表丢掉编号。Tailwind 的 preflight 会把 `list-style` 清成 `none`，而 Markdown 里**顺序是信息**，得显式还回去。
- **Don't** 用背景高亮标记命中的段落。原件上不做标记。
- **Don't** 用类型色去做强调、填充面、画边框或写正文。它们只上 ≥16px 的图形。上了面，它们就从色码变成了装潢。
- **Don't** 用石墨深浅编码分数或任何连续量。**白底上装不下三档以上，这是算术。** 用长度。
- **Don't** 用红绿表示 rerank 升降。方向靠符号。
- **Don't** 给 Level 1 的纸加阴影。纸平放在桌上，不浮。
- **Don't** 用 96px 那种段落节奏。那是落地页在制造仪式感。
- **Don't** 拉大字号跨度来做层级。层级靠字重、位置和留白。
- **Don't** 让失败低声说话。它是全系统唯一允许填底的东西——一份没入库的文档是知识库里一个静默的洞。
- **Don't** 交付只有 default 态的交互组件。七态（default / hover / focus / active / disabled / loading / error）不齐就是没做完。
- **Do** 每次要给一个东西上色时，先问**用户此刻是不是在判断它**。只是认它，就用石墨。

## Motion

> 本节不属于 DESIGN.md 规范的标准章节。规范对未知章节的行为是"保留，不报错"，因此它可以安全地随文件一起流转。加它是因为动效正是这套界面"顺不顺手"的来源，而现有规范未覆盖。

**纸和铅笔不弹跳。** 这张桌子上的一切动作都是短的、落定的、位移极小的——东西被放下，不是被抛出。

- **时长**：hover 类 {motion.duration-hover}（120ms，快到你只觉得它跟手，不觉得它在动）；常规状态变化 {motion.duration-standard}（180ms）；浮层进出 {motion.duration-overlay}（220ms）。**一次性动效不得超过 220ms。**
- **持续性动效只有一个合法用途：表示某件事真的正在进行。** {motion.duration-progress}（1400ms）用于骨架的呼吸和不定长进度。它不受 220ms 约束，因为它不是过渡，是**读数**——判据同下面的"诚实错峰"：动效对应真实事件时它就是信息，不对应时它就是装饰。
- **缓动**：进场与状态变化一律 {motion.easing-settle}，一条陡起缓落的曲线——东西迅速出现然后**落定**。退场用 {motion.easing-exit}。**不用回弹，不用 spring，不用 overshoot。** 纸放到桌上不会弹一下。
- **位移**：最大 {motion.travel}（3px）。侧栏项 hover 是底色淡入，**不位移**；浮层出现是 3px 的上浮加淡入；输入器聚焦是上层卡 3px 上浮。
- **缩放**：**不用。** 纸不会缩放。唯一的例外是圆形图标键按下时的 0.96，因为那是物理按压。
- **编排**：整屏进场时，元素**不做逐个错峰**（stagger）。桌子上的东西是同时在那儿的，不是一件件递上来的。唯一允许错峰的是流式返回的引证卡——因为它们确实是一条条到达的，错峰在此是**诚实**的，不是装饰。
- **可及性**：`prefers-reduced-motion: reduce` 下，全部时长归零、位移归零，只保留不透明度的瞬时切换。
