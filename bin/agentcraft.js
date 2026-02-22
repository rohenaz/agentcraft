#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const { existsSync, readdirSync, rmSync, statSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, realpathSync } = require('fs');
const { join, dirname } = require('path');
const { homedir } = require('os');

const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');
const ASSIGNMENTS_PATH = join(homedir(), '.agentcraft', 'assignments.json');
const [,, cmd, sub, ...rest] = process.argv;

// ANSI colors — no dependencies
const c = {
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`,
};

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function parsePackId(arg) {
  if (!arg || !arg.includes('/')) {
    console.error(c.red(`✗ pack must be "publisher/name", got: ${arg ?? '(nothing)'}`));
    process.exit(1);
  }
  const slash = arg.indexOf('/');
  const publisher = arg.slice(0, slash);
  const name = arg.slice(slash + 1);
  return { publisher, name, id: arg, url: `https://github.com/${publisher}/${name}` };
}

function readPackMeta(packPath) {
  try { return JSON.parse(readFileSync(join(packPath, 'pack.json'), 'utf-8')); } catch { return {}; }
}

function getInstalledPacks() {
  if (!existsSync(PACKS_DIR)) return [];
  const packs = [];
  for (const publisher of readdirSync(PACKS_DIR)) {
    const ppath = join(PACKS_DIR, publisher);
    try { if (!statSync(ppath).isDirectory()) continue; } catch { continue; }
    for (const name of readdirSync(ppath)) {
      try { if (statSync(join(ppath, name)).isDirectory()) packs.push(`${publisher}/${name}`); } catch { continue; }
    }
  }
  return packs;
}

function packAdd(packArg) {
  const { publisher, name, url } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (existsSync(dest)) {
    console.log(c.dim(`Already installed: ${publisher}/${name}`));
    process.exit(0);
  }
  ensureDir(join(PACKS_DIR, publisher));
  console.log(`→ Installing ${c.cyan(`${publisher}/${name}`)} from ${c.dim(url)} ...`);
  const r = spawnSync('git', ['clone', url, dest], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(c.red(`✗ Failed to install ${publisher}/${name}`));
    process.exit(1);
  }
  console.log(c.green(`✓ Installed: ${publisher}/${name}`));
}

function packRemove(packArg) {
  const { publisher, name } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (!existsSync(dest)) {
    console.error(c.red(`✗ Not installed: ${publisher}/${name}`));
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
  console.log(c.green(`✓ Removed: ${publisher}/${name}`));
}

function packUpdate(packArg) {
  const { publisher, name } = parsePackId(packArg);
  const dest = join(PACKS_DIR, publisher, name);
  if (!existsSync(dest)) {
    console.error(c.red(`✗ Not installed: ${publisher}/${name}`));
    console.error(c.dim(`  Run: agentcraft add ${publisher}/${name}`));
    process.exit(1);
  }
  console.log(`→ Updating ${c.cyan(`${publisher}/${name}`)} ...`);
  spawnSync('git', ['-C', dest, 'pull'], { stdio: 'inherit' });
}

function packList() {
  const packs = getInstalledPacks();
  if (!packs.length) {
    console.log(c.dim('No packs installed.'));
    console.log('');
    console.log('Install the official pack:');
    console.log(`  ${c.cyan('agentcraft add rohenaz/agentcraft-sounds')}`);
    return;
  }
  console.log(c.bold('Installed packs:'));
  for (const p of packs) {
    const meta = readPackMeta(join(PACKS_DIR, ...p.split('/')));
    const version = meta.version ? c.dim(` v${meta.version}`) : '';
    const desc    = meta.description ? c.dim(`   ${meta.description}`) : '';
    console.log(`  ${c.cyan(p)}${version}${desc}`);
  }
}

function packInit() {
  console.log(c.bold('Initializing AgentCraft...'));
  console.log('');

  // 1. Install official pack if missing
  const officialPack = join(PACKS_DIR, 'rohenaz', 'agentcraft-sounds');
  if (!existsSync(officialPack)) {
    packAdd('rohenaz/agentcraft-sounds');
  } else {
    console.log(c.dim(`✓ Official pack already installed`));
  }

  // 2. Create assignments.json from pack defaults if missing
  if (!existsSync(ASSIGNMENTS_PATH)) {
    const defaultsPath = join(officialPack, 'defaults', 'assignments.json');
    if (existsSync(defaultsPath)) {
      ensureDir(join(homedir(), '.agentcraft'));
      copyFileSync(defaultsPath, ASSIGNMENTS_PATH);
      console.log(c.green('✓ Created ~/.agentcraft/assignments.json'));
    }
  } else {
    console.log(c.dim('✓ assignments.json already exists'));
  }

  console.log('');
  console.log(c.green('✓ AgentCraft ready!'));
  console.log(`  Dashboard: ${c.cyan('agentcraft start')}`);
  console.log(`  Browse packs: ${c.cyan('agentcraft list')}`);
}

function createPack(name) {
  if (!name) {
    console.error(c.red('Usage: agentcraft create-pack <name>'));
    console.error(c.dim('  Example: agentcraft create-pack my-sounds'));
    process.exit(1);
  }
  if (existsSync(name)) {
    console.error(c.red(`✗ Directory already exists: ${name}`));
    process.exit(1);
  }

  // Try to detect GitHub username from git config
  let publisher = 'your-github-username';
  try {
    const gitUser = execSync('git config --global user.name 2>/dev/null', { encoding: 'utf-8' }).trim();
    const gitEmail = execSync('git config --global github.user 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (gitEmail) publisher = gitEmail;
    else if (gitUser) publisher = gitUser.toLowerCase().replace(/\s+/g, '-');
  } catch { /* use default */ }

  console.log(`→ Creating pack ${c.cyan(name)} ...`);

  // Directory structure
  ensureDir(join(name, 'sounds', 'session-start'));
  ensureDir(join(name, 'sounds', 'task-complete'));
  ensureDir(join(name, 'sounds', 'error'));
  ensureDir(join(name, 'ui', 'my-theme'));

  // pack.json
  writeFileSync(join(name, 'pack.json'), JSON.stringify({
    name,
    publisher,
    version: '1.0.0',
    description: 'My AgentCraft sound pack',
    types: ['sounds'],
  }, null, 2) + '\n');

  // .gitignore
  writeFileSync(join(name, '.gitignore'), '.DS_Store\nThumbs.db\n');

  // README.md
  writeFileSync(join(name, 'README.md'), `# ${name}

An [AgentCraft](https://github.com/rohenaz/agentcraft) sound pack.

## Install

\`\`\`bash
agentcraft add ${publisher}/${name}
\`\`\`

Or manually:

\`\`\`bash
git clone https://github.com/${publisher}/${name} ~/.agentcraft/packs/${publisher}/${name}
\`\`\`

## Structure

Drop \`.mp3\`, \`.wav\`, \`.ogg\`, or \`.m4a\` files into directories. The dashboard auto-discovers them:

\`\`\`
sounds/
  session-start/     ← sounds here appear under "sounds > session start" group
  task-complete/
  error/
ui/
  my-theme/          ← optional: UI sounds for the dashboard itself
    click.mp3
    hover.mp3
    confirm.mp3
    error.mp3
    pageChange.mp3
\`\`\`

Top-level directories become group tabs. Nested directories become sub-tabs and subcategories.
Any layout works — organise however makes sense for your sounds.

## Publishing

1. Push this repo to GitHub as \`${publisher}/${name}\`
2. Go to **Settings → Topics** and add the topic \`agentcraft-pack\`
3. The community registry picks it up within 6 hours

Users can then find and install it from the AgentCraft dashboard PACKS tab.
`);

  console.log(c.green(`✓ Created ${name}/`));
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Drop ${c.cyan('.mp3/.wav/.ogg')} files into the subdirectories`);
  console.log(`  2. Push to GitHub as ${c.cyan(`${publisher}/${name}`)}`);
  console.log(`  3. Add topic ${c.cyan('agentcraft-pack')} in GitHub Settings → Topics`);
  console.log('');
  console.log('Test locally before publishing:');
  console.log(c.dim(`  git clone . ~/.agentcraft/packs/${publisher}/${name}`));
  console.log(c.dim('  agentcraft start'));
}

function getWebDir() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return join(process.env.CLAUDE_PLUGIN_ROOT, 'web');
  }
  // Global bun/npm install: bin/agentcraft.js → package root → web/
  try {
    return join(dirname(dirname(realpathSync(__filename))), 'web');
  } catch {
    console.error(c.red('✗ Cannot locate web directory. Set CLAUDE_PLUGIN_ROOT or reinstall.'));
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
${c.bold('AgentCraft')} — assign sounds to AI agent lifecycle events

${c.cyan('Usage:')}
  agentcraft init                       Set up AgentCraft (install pack + config)
  agentcraft add <publisher/name>       Install a sound pack from GitHub
  agentcraft remove <publisher/name>    Remove an installed pack
  agentcraft update [publisher/name]    Update a pack, or all packs if no arg given
  agentcraft list                       List installed packs
  agentcraft start                      Launch the dashboard (port 4040)
  agentcraft create-pack <name>         Scaffold a new sound pack repo

${c.cyan('Examples:')}
  agentcraft init
  agentcraft add rohenaz/agentcraft-sounds
  agentcraft add publisher/custom-pack
  agentcraft update
  agentcraft list
  agentcraft create-pack my-sounds

${c.dim('Packs are stored at: ~/.agentcraft/packs/<publisher>/<name>/')}
${c.dim('Any git repo cloned there is automatically discovered by the dashboard.')}

${c.cyan('Install the Claude Code plugin:')}
  claude plugin install agentcraft@rohenaz
`);
}

// Route commands
if (cmd === 'init') {
  packInit();
} else if (cmd === 'add') {
  if (!sub) { console.error(c.red('Usage: agentcraft add <publisher/name>')); process.exit(1); }
  packAdd(sub);
} else if (cmd === 'remove') {
  if (!sub) { console.error(c.red('Usage: agentcraft remove <publisher/name>')); process.exit(1); }
  packRemove(sub);
} else if (cmd === 'update') {
  if (!sub) {
    const packs = getInstalledPacks();
    if (!packs.length) { console.log(c.dim('No packs installed.')); process.exit(0); }
    for (const p of packs) packUpdate(p);
  } else {
    packUpdate(sub);
  }
} else if (cmd === 'list') {
  packList();
} else if (cmd === 'start') {
  const webDir = getWebDir();
  if (!existsSync(webDir)) {
    console.error(c.red(`✗ Web directory not found: ${webDir}`));
    process.exit(1);
  }
  console.log(`→ Starting AgentCraft at ${c.cyan('http://localhost:4040')} ...`);
  execSync(`cd "${webDir}" && bun install --silent && bun dev --port 4040`, { stdio: 'inherit' });
} else if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  showHelp();
} else if (cmd === 'create-pack') {
  createPack(sub);
} else if (cmd === 'pack') {
  // Legacy shim — print migration hint and route through
  const newCmd = sub === 'install' ? 'add' : sub;
  console.error(c.dim(`Note: "agentcraft pack ${sub}" → "agentcraft ${newCmd}"`));
  if (sub === 'install') { if (!rest[0]) { console.error(c.red('Usage: agentcraft add <publisher/name>')); process.exit(1); } packAdd(rest[0]); }
  else if (sub === 'remove') { if (!rest[0]) { console.error(c.red('Usage: agentcraft remove <publisher/name>')); process.exit(1); } packRemove(rest[0]); }
  else if (sub === 'update') {
    if (!rest[0] || rest[0] === '--all') { const packs = getInstalledPacks(); for (const p of packs) packUpdate(p); }
    else packUpdate(rest[0]);
  }
  else if (sub === 'list') packList();
  else { console.error(c.red(`Unknown: agentcraft pack ${sub}`)); process.exit(1); }
} else {
  console.error(c.red(`✗ Unknown command: ${cmd}`));
  showHelp();
  process.exit(1);
}
