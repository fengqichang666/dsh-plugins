# dsh-default-reasoning

给没有推理元数据的新模型补齐统一的推理档位，并默认使用 `high`。

默认档位：`low`、`medium`、`high`、`xhigh`、`max`。

插件只填充“没有可用推理档位的模型”。已有可用模型能力和显式声明的推理配置不会被覆盖；仅有 `off` 档位的占位元数据也会补齐默认档位。

## 安装

桌面版由 Electron 应用管理 `desktop` profile。安装本地版本时，将插件目录作为本地插件加入桌面插件管理器；命令行启动器会拒绝直接操作 `desktop` profile。

完全退出并重新打开 DSH。需要自定义档位时，在 profile 的 `cordis.patch.yml` 中覆盖插件配置：

```yaml
- id: dsh-default-reasoning
  config:
    defaultEffort: high
    efforts: [low, medium, high, xhigh, max]
```

如果上游接口实际不接受某个档位，请从 `efforts` 中删掉该档位；插件不会伪造上游接口能力。
