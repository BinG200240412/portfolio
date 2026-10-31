# 作品集 DeepSeek 部署记录

状态：服务器和 HTTPS 已完成，等待本人私密输入新 Key。没有真实模型调用，前端没有激活。

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

待完成：本人输入新专用 Key；只 restart 新 `portfolio-ai`；核对 health、会话与真实简短问答；实际余额不足时由本人处理，不自动充值；成功后才加载前端 `configureHosted()` 并从主站红点验收。不能把这份安装记录当成已完成 AI 接入。

不要清空限额 SQLite 来“修复”额度耗尽，也不要把私密配置放到 Git 或静态目录。任何后续服务更新先保留环境、数据库和旧服务快照。
