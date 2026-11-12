# DSH Plugins

个人 DSH 插件合集。每个插件可以单独安装；模型管理插件将模型直接写入 DSH 原生 `llm-pi-ai` 配置。

| 插件 | 目录 | 作用 |
| --- | --- | --- |
| `dsh-default-reasoning` | [`dsh-default-reasoning/`](dsh-default-reasoning/) | 给缺少能力元数据的模型补充推理默认值、1M 上下文和图片输入。 |
| `dsh-model-manager` | [`dsh-model-manager/`](dsh-model-manager/) | 在设置中提供独立的模型快捷管理栏目，保存后同步到原生 Models。 |

## dsh-default-reasoning

默认推理档位：`low`、`medium`、`high`、`xhigh`、`max`。仅补充没有可用推理档位或默认值的模型，不覆盖明确配置；缺少能力元数据时默认补齐 1M 上下文和图片输入。

桌面版由 Electron 应用管理 `desktop` profile。安装本地版本时，将 `dsh-default-reasoning/` 目录作为本地插件加入桌面插件管理器；命令行启动器会拒绝直接操作 `desktop` profile。安装或更新后完全退出并重新打开 DSH。

需要自定义档位时，在 profile 的 `cordis.patch.yml` 中覆盖插件配置：

```yaml
- id: dsh-default-reasoning
  config:
    defaultEffort: high
    efforts: [low, medium, high, xhigh, max]
```

如果上游接口实际不接受某个档位，请从 `efforts` 中删掉该档位；插件不会伪造上游接口能力。

## dsh-model-manager

见 [插件说明](dsh-model-manager/README.md)。可新建提供商并填写地址、接口格式、API Key 和首个模型，也可向已有的 pi-ai 提供商添加模型；历史记录用于可选回填。密钥通过 DSH 凭据接口保存，模型写入后会出现在原生 Models/模型选择器中。
