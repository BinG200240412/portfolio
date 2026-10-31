# 作品集 DeepSeek 部署记录

状态：服务器和 HTTPS 已完成，新 Key 已私密保存，真实 DeepSeek 问答成功；首页加入生产连接初始化。

- 用户确认现有阿里云杭州服务器，最终选择 DeepSeek，不新增购买服务器。
- 本人重新登录阿里云后，使用已启用的 Workbench 免密通道；未读取或尝试历史密码、数独密钥。
- 主机 ED25519 指纹与已有授权记录匹配。Ubuntu 24.04.4、Python 3.12.3、Caddy 2.11.4。
- 8787–8790 为已有服务占用；新服务监听 `127.0.0.1:8791`。
- 源文件固定为 `f8e794da3139a97d79b57550f8bd0a061a8abec3`。服务器访问 GitHub raw 被重置，安装在写入之前停止；随后从自己的已发布 HTTPS 网站取同一文件并逐个 SHA-256 校验，成功后才安装。没有降低 TLS 校验或修改服务器网络。
- 新建无登录权限的独立系统用户 `portfolio-ai`。应用 `/opt/portfolio-ai` 为 root 拥有，目录 0755、代码 0644；服务只写 `/var/lib/portfolio-ai`。
- 新 unit `portfolio-ai.service` 已 enable / active，有内存、CPU、任务数与文件权限限制。原 Caddy、数独服务 MainPID / ActiveEnterTimestampMonotonic 在安装前后相同。
- 私密目录 `/etc/portfolio-ai` 0700，`portfolio-ai.env` root:root 0600；会话密钥在服务器生成，未输出；DeepSeek Key 留空。本人可在服务器终端运行 `store_key.py` 隐藏输入，终端不能禁用回显时拒绝填写。
- 新 A 记录 `ai.bing2002.com` 指向已有服务器，TTL 10 分钟，其余十条记录保留；主站与数独域名没有改指向。
- Caddy 只追加 AI 域名段，原始文件完整备份并原位保留。先 validate，再 graceful reload；原进程身份相同，未 restart，未改原全局选项。转发头 `X-Real-IP` 强制覆盖，路由无静态文件服务。

公网检查：

| 请求 | 实际结果 |
| --- | --- |
| HTTPS `GET /portfolio-ai/health` | 200，`{"ready":false}`；TLS 正常验证 |
| 正式 origin `POST session`，无 Key | 503 `not_configured`，携带准确 CORS、credentials、no-store；不请求模型 |
| 其他 origin `POST session` | 403 `forbidden_origin`，没有允许来源响应头 |
| `https://www.bing2002.com/` | 301 至 `https://bing2002.com/`，后端只需主域 origin |
| 服务器无密钥 GET DeepSeek `/models` | 401；只证明 DNS / TLS / 网络可达，没有模型生成或费用 |

本人随后明确授权读取指定的本机 API 文件并填入已打开的服务器隐藏输入。只提取单个密钥，未打印原文件或密钥。Workbench 将括号粘贴控制序列传入 getpass，首次格式校验拒绝；移除成对的外层粘贴控制序列后保存成功。已在密钥输入工具中修复此兼容问题，仍拒绝不成对/内嵌控制符，不删除任意字符。

仅 restart 新 `portfolio-ai`，保存前后原 Caddy 与数独服务身份一致。私密环境仍为 root:root 0600。公网 health 变为 `ready:true`，然后通过正式 session / cookie / CSRF 协议发送了一次数独作品介绍请求，HTTP 200 / `status:ok`，返回时间 2091ms。回复基于公开作品资料，未冒充用户或宣称离线辅导演示已验证联网能力。没有读取旧密钥、充值、修改支付设置或提高额度。

首页新增 `assets/assistant-hosted.js`，在连接模块之后、聊天 UI 之前 defer 加载。只允许正式 origin，初始化零网络请求；首次实际发送才请求 session。原有首次红点先导航、再次才可 AI 的门禁保持。

本地共 35 项检查：17 项服务端协议/配额、5 项私密输入工具、13 项前端传输/UI/生产初始化。真实 API 说明密钥与模型当时可用，不保证未来余额、服务商速度或每个生成回答的事实准确度。

主站浏览器已完成中文真实问答，未出现控制台错误或横向溢出。首轮回答把已有残局分享功能说成仅设计功能；依据公开案例中的真实分享界面与当前维护版本记录补明确切状态，并将默认回答调整为一至三句，不给已知事实附加泛化的保留说明。原型与设想的边界仍保留，未知事实仍不能补写。

不要清空限额 SQLite 来“修复”额度耗尽，也不要把私密配置放到 Git 或静态目录。任何后续服务更新先保留环境、数据库和旧服务快照。
