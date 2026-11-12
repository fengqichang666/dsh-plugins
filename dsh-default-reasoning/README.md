# dsh-default-reasoning

给没有完整推理元数据的新模型补齐统一推理档位，并在默认档位缺失时使用 `high`。能力元数据缺失时，默认补齐 1M 上下文和图片输入。

默认推理档位：`low`、`medium`、`high`、`xhigh`、`max`。已有可用能力和显式配置不会被覆盖；仅有 `off` 占位档位的模型也会补齐可用档位。

推理强度、上下文窗口和图片输入默认分别开启，可在插件配置中独立关闭。例：

```yaml
- id: dsh-default-reasoning
  config:
    reasoningEffort: false
    contextWindow: true
    imageInput: false
```

未填写的开关按开启处理。关闭某项后，插件不会为该项补充元数据；模型原本明确声明的能力仍会保留。

## 安装

桌面版由 Electron 应用管理 `desktop` profile。将本目录作为本地插件加入桌面插件管理器；命令行启动器不能直接操作 `desktop` profile。安装或更新后完全退出并重新打开 DSH。

需要自定义档位时，在 profile 的 `cordis.patch.yml` 中覆盖配置：

```yaml
- id: dsh-default-reasoning
  config:
    defaultEffort: high
    reasoningEffort: true
    contextWindow: true
    imageInput: true
    efforts: [low, medium, high, xhigh, max]
```

如果上游接口不接受某个档位，请从 `efforts` 中删除它；插件不会伪造上游接口能力。
