#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const { existsSync, readdirSync, rmSync, statSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');
const [,, cmd, sub, ...rest] = process.argv;

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function parsePackId(arg) {
  if (!arg || !arg.includes('/')) {
    console.error(`Error: pack must be "publisher/name", got: ${arg ?? '(nothing)'}`);
    process.exit(1);
  }
  const slash = arg.indexOf('/');
  const publisher = arg.slice(0, slash);
  const name = arg.slice(slash + 1);
  return { publisher, name, id: arg, url: `https://github.com/${publisher}/${name}` };
}

function getInstalledPacks() {
  if (!existsSync(PACKS_DIR)) return [];
  const packs = [];
  for (const publisher of readdirSync(PACKS_DIR)) {
    const ppath = join(PACKS_DIR, publisher);
    try {
      if (!statSync(ppath).isDirectory()) continue;
    } catch { continue; }
    for (const name of readdirSync(ppath)) {
      try {
        if (statSync(join(ppath, name)).isDirectory()) packs.push(`${publisher}/${name}`);
      } catch { continue; }
    }
  }
  return packs;
}

function packInstall(packArg) {
  const { publisher, name, url } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (existsSync(dest)) {
    console.log(`Already installed: ${publisher}/${name}`);
    process.exit(0);
  }
  ensureDir(join(PACKS_DIR, publisher));
  console.log(`Installing ${publisher}/${name} from ${url} ...`);
  const r = spawnSync('git', ['clone', url, dest], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`Failed to install ${publisher}/${name}`);
    process.exit(1);
  }
  console.log(`\nInstalled: ${publisher}/${name}`);
}

function packRemove(packArg) {
  const { publisher, name } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (!existsSync(dest)) {
    console.error(`Not installed: ${publisher}/${name}`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
  console.log(`Removed: ${publisher}/${name}`);
}

function packUpdate(packArg) {
  const { publisher, name } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (!existsSync(dest)) {
    console.error(`Not installed: ${publisher}/${name}. Run: agentcraft pack install ${publisher}/${name}`);
    process.exit(1);
  }
  console.log(`Updating ${publisher}/${name} ...`);
  spawnSync('git', ['-C', dest, 'pull'], { stdio: 'inherit' });
}

function packList() {
  const packs = getInstalledPacks();
  if (!packs.length) {
    console.log('No packs installed.');
    console.log('\nInstall the official pack:');
    console.log('  agentcraft pack install rohenaz/agentcraft-sounds');
  } else {
    console.log('Installed packs:');
    for (const p of packs) console.log(`  ${p}`);
  }
}

function showHelp() {
  console.log(`
AgentCraft CLI — assign sounds to AI agent lifecycle events

Usage:
  agentcraft pack install <publisher/name>     Install a sound pack from GitHub
  agentcraft pack remove  <publisher/name>     Remove an installed pack
  agentcraft pack update  <publisher/name>     Update a pack (git pull)
  agentcraft pack update  --all                Update all installed packs
  agentcraft pack list                         List installed packs
  agentcraft start                             Launch the dashboard (port 4040)

Examples:
  agentcraft pack install rohenaz/agentcraft-sounds
  agentcraft pack update --all
  agentcraft pack list

Packs are stored at: ~/.agentcraft/packs/<publisher>/<name>/
Any git repo cloned there is automatically discovered by the dashboard.

Install the Claude Code plugin:
  claude plugin install agentcraft@rohenaz
`);
}

if (cmd === 'pack') {
  if (sub === 'install') {
    if (!rest[0]) { console.error('Usage: agentcraft pack install <publisher/name>'); process.exit(1); }
    packInstall(rest[0]);
  } else if (sub === 'remove') {
    if (!rest[0]) { console.error('Usage: agentcraft pack remove <publisher/name>'); process.exit(1); }
    packRemove(rest[0]);
  } else if (sub === 'update') {
    if (rest[0] === '--all') {
      const packs = getInstalledPacks();
      if (!packs.length) { console.log('No packs installed.'); process.exit(0); }
      for (const p of packs) packUpdate(p);
    } else {
      if (!rest[0]) { console.error('Usage: agentcraft pack update <publisher/name> | --all'); process.exit(1); }
      packUpdate(rest[0]);
    }
  } else if (sub === 'list') {
    packList();
  } else {
    console.error(`Unknown pack subcommand: ${sub ?? '(none)'}`);
    console.error('Usage: agentcraft pack <install|remove|update|list>');
    process.exit(1);
  }
} else if (cmd === 'start') {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) {
    console.error('CLAUDE_PLUGIN_ROOT not set. This command is intended to run from the Claude Code plugin context.');
    process.exit(1);
  }
  execSync(`cd "${pluginRoot}/web" && bun dev --port 4040`, { stdio: 'inherit' });
} else if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  showHelp();
} else {
  console.error(`Unknown command: ${cmd}`);
  showHelp();
  process.exit(1);
}
