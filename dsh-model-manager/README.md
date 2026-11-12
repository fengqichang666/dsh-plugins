# dsh-model-manager

在 DSH 设置中添加独立的“模型管理”栏目，通过 DSH Remote 将模型写入原生 `llm-pi-ai` 设置；成功后，原生 Models 和模型选择器会读取同一份配置。

## 功能

- 新建提供商时可填写提供商 ID、名称、服务端地址（Base URL）、接口格式、API Key 和首个模型；没有历史记录也能直接添加。
- 接口格式支持 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages。
- 向已配置且可编辑的 pi-ai 提供商继续添加模型。
- 模型 ID 和名称可自由输入；历史列表按模型 ID 去重且仅展示 ID，选择后只回填 ID 和名称，保留当前上下文、图片选项及提供商连接配置。
- 新模型默认上下文为 1,000,000 tokens，并启用图片输入。
- 保存前显示确认窗口；写入使用当前设置 revision，检测并提示并发冲突。
- API Key 通过 DSH 原生凭据接口保存，不写入模型配置、日志或确认摘要。无鉴权服务可留空。
- 配置保存成功而密钥保存失败时，仅重试密钥；配置发生并发冲突时刷新并要求重新确认。
- 不另存一份模型历史；已有提供商的地址、密钥等连接参数仍在原生 Models 中编辑。

## 新建提供商

打开“设置 → 模型管理”，添加方式选择“新建提供商及模型”：

1. 提供商 ID 例如 `my-provider`，以小写字母开头，使用小写字母、数字及单个连字符；名称选填。
2. 按服务商文档填写接口格式和 Base URL。OpenAI 兼容服务通常为 `https://example.com/v1`；Anthropic 通常为 `https://example.com`，不要追加 `/v1/messages`。最终以服务商文档为准。
3. API Key 只填密钥本身，不要带引号或 `API_KEY=`；本地无鉴权服务可留空。
4. 直接填写模型 ID 和名称，按需调整上下文和图片支持，点击创建并确认。

保存成功后，可以切换“向已有提供商添加模型”，为刚创建的提供商继续添加模型。已有 ID 不能被新建流程覆盖。

如果还需要默认推理档位 `high`，请同时启用仓库根目录的 `dsh-default-reasoning`；模型管理插件不伪造 provider 的推理能力。

将此目录作为本地插件加入 DSH 桌面插件管理器。安装或更新后完全退出并重新打开 DSH，客户端设置栏目才会加载。

修改源码后生成客户端入口，再运行逻辑检查：

```sh
npm install
npm run build
npm test
```

`client.source.js` 为界面源码，`client.js` 为 DSH 实际加载的经典脚本入口；不要直接将 ESM 源码作为客户端入口。

本地逻辑检查不会启动 DSH 或请求真实接口；模型条目是否被当前 provider 接口接受仍取决于该 provider 的 API 能力。
