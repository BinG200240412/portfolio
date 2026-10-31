# 作品集语音输入部署

2026-10-31：现有杭州服务器新增独立 CPU 识别服务，DeepSeek 继续负责文字问答。没有新增付费语音 API 或供应商密钥，识别使用现有服务器资源和带宽；没有把模型分发给访客。

## 识别与资源

- `portfolio-speech.service` 使用独立 nologin 用户，只有 `127.0.0.1:8792` 监听；主网关仍为 8791。单任务、单 CPU 线程、CPUQuota 100%、MemoryMax 700MiB。模型常驻子进程；原生推理 28 秒未结束则终止并仅重启语音服务。
- sherpa-onnx 2.0.1、numpy 2.2.6，独立 venv，不安装 PyTorch。SenseVoiceSmall int8 权重和 tokens 按维护者官方文件 SHA-256 核验后才加载。
- 官方 GitHub 下载在服务器上极慢，Chrome 文件上传通道要求额外扩展文件权限，未扩大权限；改从 ModelScope 的固定社区仓库提交 `59ee0bceb05d61d4148341323e509db2899bd9a2` 传输模型数据。只取模型、tokens 和已知短测试音频，忽略镜像代码；本机另下载官方发布压缩包并通过官方 SHA-256 校验，核对 tokens 与许可文件。
- 官方压缩包 SHA-256：`7d1efa2138a65b0b488df37f8b89e3d91a60676e416f515b952358d83dfd347e`；权重：`c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51`；tokens：`f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc`。服务目录保留官方 LICENSE/README、SenseVoice 模型名称与来源。
- 真实模型结果：官方中文短音频 1.980 秒、英文 1.521 秒、合成至完整 20 秒的中文输入 6.375 秒；峰值 `420364288` 字节，约 401MiB，无重启。数字与专有名词仍可能转写错误，结果只填草稿，交给读者确认。

## 正式接线和保护

- Caddy 仅为 `/portfolio-ai/transcribe` 增加 644096 字节 body 限制；文字 JSON 路由保留 16KB。更新前备份，validate 成功后 graceful reload。原数独、Caddy MainPID 和 ActiveEnterTimestamp 保持一致，没有 restart 它们。
- 新代码以 SHA-256 核验后放入 root 拥有目录。主 AI 环境仅增加 `SPEECH_ENABLED=1`，其余配置逐行保持，私密环境仍 0600；未读取/输出/重用其他业务密钥。既有 SQLite 未清空。
- session/cookie/CSRF/Origin 验证后接收 WAV；严格要求 PCM16、16kHz、单声道、最多 20 秒。结束后才上传，实时点阵完全由本地 AnalyserNode 驱动。
- 识别单并发，独立持久化次数限额：3/IP/分钟、20/IP/日、15/会话/日、60/全站/日、600/全站/月；失败也计入，其他失败不自动重传。不保存访客录音或转写内容到文件、数据库或日志。
- 公网 TLS、session、cookie、CSRF、CORS 和真实短录音识别通过。合成中文“你好，我想了解你的数独作品”返回 `status:ok`，约 1302ms；实际转写中“数独”成为“数读”，没有用后处理伪装识别准确性。无效 CSRF 返回 403 `invalid_session`。

## 前端验收

- 32 项 Python、24 项 JS 检查通过，覆盖录音格式、超限、静音、独立配额、子进程超时、会话刷新、取消、原草稿插入、不自动发送及资源回收。
- 浏览器以本机 TTS → 真实 AudioBuffer/MediaStream → AnalyserNode → AudioWorklet 走录音链路，灯珠点亮数量 0–237；停顿后生成有效短 WAV，文本只填原草稿，问答发送次数为 0。中途关闭也停止音轨并关闭 AudioContext。该项初验转写使用明确标记的本地模拟；真实公网识别另测，最终组合验收见后续记录。
- 初始页面没有麦克风权限申请、语音模块/工作线程下载、模型或 session 请求；模块在点麦克风后加载。保持第一次红点先导航、随后红点才打开底部聊天框。
- 没有访问本人的实体麦克风；不同设备的物理录音、噪声环境、Safari 授权仍需要设备实测。不能用合成音频测试替代这些结论。

来源：[DeepSeek 接口](https://api-docs.deepseek.com/api/create-chat-completion/)、[SenseVoice 官方模型说明](https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html)、[FunASR 模型许可](https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE)。

## 最终组合验收

- GitHub Pages `67151631410d1f9a65faf59b2efd87347e838a03` 已 `built`；线上懒加载模块 SHA-256 和源码匹配。主站底部浮窗显示“开始语音输入”，无旧预览假波形。
- 浏览器组合测试切为真实识别：合成 TTS → 实际录音和 Analyser/Worklet → 公网 session/CSRF 转写 → 原草稿插入，全部通过。可见灯珠数量 0–235、上传 1 次、问答发送 0 次、音轨停止 1 次、AudioContext 关闭 1 次。该测试仍未访问硬件麦克风。
- 正式站 390×844 英文白色与 1512×982 中文黑色下没有横向溢出，手机浮窗位于 x=12–378、底边 y≈828；日志未见警告或错误。临时视口已恢复，中文黑色模式已恢复。
- 最后只读核查：语音日/月计数各 2，文字问答日/月计数各 5，原计数未重置；私密环境仍 root:root 0600。语音进程重启次数 0，峰值仍约 401MiB，系统可用内存约 776MiB。
