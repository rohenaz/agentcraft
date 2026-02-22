---
allowed-tools: Bash(lsof:*), Bash(open:*), Bash(bun:*), Bash(curl:*), Bash(git:*), Bash(ls:*), Bash(mkdir:*)
description: Open the AgentCraft sound assignment dashboard. Launches web UI on port 4040.
argument-hint: "[--stop] Stop the AgentCraft server"
---

Open the AgentCraft sound assignment dashboard.

If user passed --stop argument, kill the server instead:
```bash
kill $(lsof -ti:4040) 2>/dev/null
echo "AgentCraft server stopped."
```

Otherwise, ensure the sound library is present. Check if ~/.agentcraft/sounds exists and has files:
```bash
ls ~/.agentcraft/sounds 2>/dev/null | head -1
```

If that returned nothing (empty or missing), clone the sound library:
```bash
git clone https://github.com/rohenaz/agentcraft-sounds ~/.agentcraft/sounds
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
