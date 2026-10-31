# 作品集 AI 接口

为 `bing2002.com` 底部红点对话框准备的独立后端。17 项后端集成测试、12 项前端模拟测试通过；已安装到杭州独立服务并完成 DNS / HTTPS；**未填写密钥，也未完成真实 DeepSeek 调用**。前端默认仍未连接，不会显示模拟答案。部署记录见 `../../docs/portfolio-ai-deployment-20261031.md`。

## 当前部署边界

用户最终选择使用现有阿里云杭州服务器，模型改为 DeepSeek。采用 [DeepSeek 官方接口](https://api-docs.deepseek.com/quick_start/)，不使用第三方中转、不关闭 TLS 验证、不复用旧数独凭据。2026.10.31 本人重新登录后通过已有 Workbench 免密通道部署；没有尝试旧密码。服务器端口 8787–8790 已占用，使用独立 8791。

正式连接设计：

`bing2002.com 红点聊天框 → ai.bing2002.com/portfolio-ai/ → DeepSeek Chat Completions API`

`ai.bing2002.com` 的新 A 记录已创建并解析至已核实的杭州服务器；现有 DNS 记录保留。Caddy 仅追加独立站点段，validate 后平滑 reload；原站点块、原 Caddy 与数独服务进程身份保持，未重启原服务。

## 最小部署清单

适用于现有 Linux/systemd 主机上的独立服务。已完成安装、DNS / HTTPS；当前停在本人私密填 Key，随后才做真实模型调用和前端激活。

1. 核对主机身份、地区和已有服务；保存服务/端口快照。准备独立系统用户 `portfolio-ai`，应用目录 `/opt/portfolio-ai` 由管理员拥有，服务用户不可写代码。
2. 将 `server.py`、`knowledge.md`、`store_key.py` 放入 `/opt/portfolio-ai`。无需安装第三方 Python 包。运行 `python3 -m unittest discover -s server/portfolio-ai -p 'test_server.py' -v` 与 `node server/portfolio-ai/test_frontend.cjs` 验证代码。
3. 通过本人控制的服务器交互终端运行 `sudo python3 /opt/portfolio-ai/store_key.py`，本人输入**新的 DeepSeek 作品集专用密钥**。输入隐藏，不经过聊天、命令参数或 shell 历史；程序在 `/etc/portfolio-ai/portfolio-ai.env` 原子保存，目录 0700、文件 0600，自动创建随机会话密钥，后续更换 API Key 保留原会话密钥。不调用模型、不充值、不自动重启。不要把环境变量输出到终端。也可参照 `.env.example` 用受控私密配置工具保存，不能将真实值放在仓库或静态目录。
4. 示例中的 `QUOTA_DATABASE=/var/lib/portfolio-ai/quota.sqlite3`、`KNOWLEDGE_FILE=/opt/portfolio-ai/knowledge.md` 和 `TRUST_LOOPBACK_PROXY=1` 对应独立状态路径、知识文件和可信本机代理模式；监听仅 `127.0.0.1:8791`。现有服务器的 8787–8790 已被其他服务占用，不覆盖它们。反向代理必须覆盖 `X-Real-IP`，不可透传用户伪造值。服务用户只可写自己的状态目录。
5. 安装 `portfolio-ai.service` 并检查 unit；仅启动这个新服务。确认本机 health 返回 ready=true。密钥格式存在并不证明有额度或模型权限，正式验收仍需一条低成本问答。
6. 把新子域解析到已核实的杭州主机后，使用 `Caddyfile.example` 的独立域名段配置 HTTPS。保留现有站点配置，先 validate 再平滑 reload；不要替换整个 Caddyfile 或重启数独服务。服务器级 timeouts 仅供专用新主机参考，在现有多站主机上不能直接照搬，以免影响原站。
7. 先检查 HTTPS、CORS、会话、限额和真实问答，再在首页加载连接模块后显式执行 `PortfolioAssistantConnection.configureHosted()`。未验收前不启用。同步共享资源 hash、发布 Pages，最后从总站红点实际发送并核对答案、返回与中英文错误状态。

## 费用与滥用控制

- 模型固定为服务端配置的 `deepseek-flash`，显式 `thinking:{type:"disabled"}`、`max_tokens:400`、`stream:false`，不提供工具、任意 URL、浏览器、代码执行或文件访问。只展示最终 `message.content`，不展示推理内容。参考 [官方接口](https://api-docs.deepseek.com/api/create-chat-completion/) 与 [思考开关](https://api-docs.deepseek.com/guides/thinking_mode/)。
- 默认每 IP 6 次/分钟、30 次/日；每会话 20 次/日；全站 100 次/日、1000 次/月；最多 2 个并行模型请求。每条输入和历史另有限额。所有上游尝试在请求前以 SQLite 事务计数，失败与超时同样保留计数，重启不会清空。
- 这些是**请求次数上限，不是人民币账单限额**。DeepSeek 使用本人设置的小额余额，充值和自动支付由本人决定，不能替用户充值或擅自开启自动续费。价格按 [官方定价](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)；输入与输出都收费，默认关闭思考和搜索工具。供应商后台若提供独立用量限额，同样配置；不要把账户提醒当硬限额。
- Origin、CORS、cookie、CSRF 只能限制浏览器跨站请求，不能阻止脚本伪装访客。公开匿名接口仍可能被耗尽额度；真正保底是服务端持久化总限额与供应商限额。访问增加后再考虑验证码或登录，不把前端静态 token 当秘密。
- 本服务不保存原始问题、回答或明文 IP；仅保留用于限额的带密钥摘要、时间窗口与计数。这不等于供应商完全不留合规或服务数据。本人审核公开知识后才上线，私有简历资料不要直接加入。
- 无密钥或服务端配置缺失时拒绝调用；非 2xx、超时、余额不足等不自动重复收费请求。前端等待上限为 22 秒；上游 20 秒为网络无数据超时，不保证供应商生成必定在 20 秒内终止。关闭前端会取消浏览器请求，但已到供应商的生成未必立即停止，仍受输出及次数限制。独立 Caddy 示例为入口配置请求读取和写入期限，避免慢客户端长期占据连接；仅用于新独立主机，不覆盖已有服务的全局设置。

## 知识与 Skill

`knowledge.md` 只包含现有公开作品集内容，来源见 `knowledge-sources.md`。当前是限定作品集范围的文本问答，不具备执行 Skill 的工具权限，也不会自动读取本机笔记或其他会话。后续作者可审核知识、补充回答边界；新增外部工具另行设计权限。

## 已准备的接口

- `GET /portfolio-ai/health`：最小就绪状态，不返回密钥或环境。
- `POST /portfolio-ai/session`：`{"version":1}`；设置短期 host-only、Secure、HttpOnly、SameSite=Strict cookie，返回 CSRF token。前端只在第一次实际发送时请求，不增加首页加载请求。
- `POST /portfolio-ai/chat`：`{"version":1,"messages":[{"role":"user","content":"…"}]}`，携带 cookie 与 `X-CSRF-Token`。只接收有限的 user/assistant 文本，不接收 model、system、工具或 headers。
- 成功：`{"status":"ok","message":{"role":"assistant","content":"…"}}`；错误只返回稳定错误码和通用描述，不暴露供应商原始报错、请求体、堆栈或凭据。

前端只有 `invalid_session` 会重新建立一次会话后重试；该错误发生在上游计费之前。其他错误不自动重发模型请求。

## 本次验证边界

2026.10.31：本地模拟上游验证了持久化限额、并发事务、失败计数、跨日/月、伪造 IP、会话/CSRF/CORS、固定模型和原始错误脱敏；慢速请求头/请求体在绝对读取期限后断开。修复了较长英文回复会导致下一轮历史被后端拒绝的问题，并验证 4000 中文字符可以通过请求体上限。

真实 Chrome 中使用只运行在 localhost 的测试服务，验证首次红点先导航、再次打开底部弹窗、失败后保留问题、手动重试后正确显示文本与清空输入。测试回复明确写为“本地连接测试：这不是模型回答”，仅用于 UI 验证，不部署测试服务或该文本。测试没有真实供应商调用或扣费；之后的独立服务安装见部署记录。

服务器已验证登录与主机身份、服务安装、DNS / HTTPS、允许来源的 CORS 和无密钥拒绝；错误来源返回 403，不配置允许来源。www 自动 301 至主域。尚待：本人填写新 Key、余额与模型权限、真实 session cookie 和问答、回答准确度和延迟、移动端真实网络。服务器安装不代表真实 AI 已启用。
