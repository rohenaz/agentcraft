---
allowed-tools: Bash(lsof:*), Bash(open:*), Bash(bun:*), Bash(curl:*)
description: Open the AgentCraft sound assignment dashboard. Launches web UI on port 4040.
argument-hint: "[--stop] Stop the AgentCraft server"
---

Open the AgentCraft sound assignment dashboard.

Check if server is running:
```bash
lsof -ti:4040
```

If NOT running, start it:
```bash
cd ~/code/claude-plugins/agentcraft/web && bun dev --port 4040 &
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

If user passed --stop argument, kill the server instead:
```bash
kill $(lsof -ti:4040) 2>/dev/null
```
