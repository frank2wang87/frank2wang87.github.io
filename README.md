# 汪涛 Tao Wang · 个人主页仓库

**[🌐 进入个人主页](https://frank2wang87.github.io/)**　|　**[⚙️ 编辑 / 删除各部分内容](MANAGE.md)**　|　**[✏️ 填写基本信息模板](https://github.com/frank2wang87/frank2wang87.github.io/edit/main/content/basic-info.md)**

这是个人主页的源代码和资料仓库。公开网页用于展示，编辑和删除操作统一在本仓库中完成；GitHub 验证账号写入权限。

## 填写基本信息

1. 点击上面的「填写基本信息模板」，登录自己的 GitHub 账号。
2. 按中文字段填写姓名、个人介绍、工作起止时间、岗位与工作方向、教育起止时间、学校、学位及专业方向。将【待填写】替换为你的资料；未填写项目不会展示。可复制 ### 区块增加经历。
3. 点击 **Commit changes…**，选择直接提交到 **main**，再点击 **Commit changes**。等待 GitHub Pages 部署成功后刷新网页。

## 管理其他内容

打开 **[内容管理清单](MANAGE.md)**，每个部分、每篇论文、每组专利都有「编辑」和「删除」入口。删除会进入 GitHub 确认页，提交后才生效。

| 内容 | 文件 |
| --- | --- |
| 基本信息（个人介绍、工作与教育经历、方向） | [content/basic-info.md](content/basic-info.md) |
| Research Interests / 研究兴趣（可添加说明） | [content/interests.json](content/interests.json) |
| 联系方式与学术链接 | [content/contact.json](content/contact.json) |
| 页面其他文案 | [content/site.json](content/site.json) |
| 论文资料 | [publications/](publications/) |
| 专利资料 | [patents/](patents/) |
| 学术指标和原始导入档案 | [profile.json](profile.json) |

基本信息统一模板采用中文标签，直接替换冒号后的内容即可。自我介绍可用多段文字；其他字段在同一行填写。旧的分散基本信息文件不再控制主页展示。论文与专利等 JSON 文件仍需保留有效格式。

删除论文、专利文件后，网页会跳过已删除的资料，不必再次修改索引。新增条目时需将文件路径加入对应 `index.json`。修改资料并提交到 main 后，Refresh portfolio content 工作流会自动运行 node build.mjs，生成页面正文与管理清单，再发布到 GitHub Pages；不需要手动运行构建。可在仓库 Actions 页面检查结果。

## 从 GitHub 个人资料页进入

打开 [frank2wang87 的 GitHub 个人资料页](https://github.com/frank2wang87)，进入 **Repositories**，点击 **frank2wang87.github.io**，即可在本页选择「进入个人主页」或「编辑 / 删除各部分内容」。也可以在 GitHub 的 **Edit profile → Website** 中填入 `https://frank2wang87.github.io/`，方便从个人资料页直接访问。

## 数据与核验

论文来源为 Google Scholar。专利核验记录见 [patent-review.html](https://frank2wang87.github.io/patent-review.html) 与 [patent-audit.json](patent-audit.json)。核验报告及提交历史保留历史快照，删除展示资料不等于删除这些历史记录。法律状态据来源数据库快照，最终以各专利局官方登记为准。

此仓库和资料文件为公开内容，请只填写拟公开的信息。

## 专利方向分类

专利按主要技术主题分成 **大模型、计算机视觉、计算机体系结构、通用AI** 四类，主页可按方向筛选，进入专利列表时按方向分组，各类内部按申请时间倒序排列。每组专利 JSON 的 `category` 字段保存其主要分类，可自行修改。`categoryReason` 记录当前分类依据；这属于展示分类，不是官方 IPC/CPC 分类。

## 联系方式与 Research Interests

- [编辑联系方式（含 Email）](https://github.com/frank2wang87/frank2wang87.github.io/edit/main/content/contact.json)：`email` 填写邮箱，例如 `"email": "name@example.com"`，主页只显示可点击的信封图标，不显示邮箱地址文字。也兼容 `Email`。JSON 的引号需使用英文直引号 `"`。
- [编辑 Research Interests](https://github.com/frank2wang87/frank2wang87.github.io/edit/main/content/interests.json)：这是侧边研究兴趣列表的唯一主编辑入口，基本信息模板不再重复设置该列表。每项可填英文名称 `name`、中文名称 `translation` 和具体说明 `description`。复制一个对象即可增加方向，项目之间保留逗号。

下面是条目的填写格式（内容仅为填写示例）：

```json
{
  "name": "Large Language Models",
  "translation": "大模型",
  "description": "在这里填写该方向的研究内容"
}
```

需要添加其他联系链接时，可在联系方式中加入 `links` 数组，例如 `"links": [{"label": "ORCID", "url": "https://orcid.org/你的编号"}]`。

内容管理清单已列出论文作者全名单、专利发明人全名单及代表公开号，方便核对后再执行删除。

## 修改已提交但尚未看到更新

提交资料后，进入 [Actions](https://github.com/frank2wang87/frank2wang87.github.io/actions)，等待 **Refresh portfolio content** 和随后的 **pages build and deployment** 均显示绿色成功，再刷新主页。浏览器仍显示旧页时可按 Ctrl+F5。更新会直接写入页面正文，JavaScript 加载失败也能看到已发布内容。

公开页会在打开、切回标签页及停留期间检查已发布版本；检测到新版本时会自动加载对应页面。Email 只显示信封图标，点击后通过邮件客户端发送。
