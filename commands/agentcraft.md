---
allowed-tools: Bash(lsof:*), Bash(open:*), Bash(bun:*), Bash(curl:*), Bash(git:*), Bash(ls:*), Bash(mkdir:*), Bash(agentcraft:*)
description: Open the AgentCraft sound assignment dashboard. Launches web UI on port 4040.
argument-hint: "[--stop] Stop the AgentCraft server"
---

Open the AgentCraft sound assignment dashboard.

If user passed --stop argument, kill the server instead:
```bash
kill $(lsof -ti:4040) 2>/dev/null
echo "AgentCraft server stopped."
```

Run first-time setup (installs official pack + creates assignments.json if missing):
```bash
agentcraft init
```

Check if server is already running:
```bash
lsof -ti:4040
```

If NOT running, start it:
```bash
cd "$CLAUDE_PLUGIN_ROOT/web" && bun install --silent && bun dev --port 4040 &
```

Poll until server responds (max 15 attempts, 1s apart):
```bash
for i in {1..15}; do
  curl -s http://localhost:4040/api/health | grep -q '"ok"' && break
  sleep 1
done
```

Then open in browser:
```bash
open http://localhost:4040
```
