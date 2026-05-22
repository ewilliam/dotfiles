# dat dotfiles

macOS dotfiles managed with [GNU Stow](https://www.gnu.org/software/stow/) and [Homebrew](https://brew.sh/).
Safe to re-run anytime -- every step is idempotent.

## What's inside

| Category | Configs |
| --- | --- |
| **Shell** | fish, readline |
| **Git** | git, delta, jj |
| **Editor** | neovim, zed |
| **Terminal** | ghostty, tmux |
| **SSH** | 1Password SSH agent |
| **Email** | aerc, isync, msmtp, notmuch |
| **AI** | claude, codex, opencode |
| **Automation** | hammerspoon, karabiner |
| **Media** | newsboat, pianobar |

## New Mac setup

### Before you start

1. **Sign in to iCloud** in System Settings → Apple ID. The bootstrap installs Mac App Store apps, which requires an active Apple ID.

2. **Install and open 1Password.app**, sign in, and enable the SSH agent: Settings → Developer → "Use the SSH agent". Step 4 of the bootstrap (`03-1password.sh`) signs in to the 1Password CLI and verifies the SSH agent socket — it will warn but not fail if the app isn't running yet, but SSH won't work until it is.

3. **Open Terminal.app** (the only tool available on a stock Mac).

### Bootstrap

```bash
xcode-select --install  # if you want git before the bootstrap handles it
git clone https://github.com/ewilliam/dotfiles.git ~/Projects/dotfiles
cd ~/Projects/dotfiles
bash bootstrap.sh
```

Clone over HTTPS since SSH isn't available yet — the bootstrap installs 1Password, configures the SSH agent, and sets up `~/.ssh/config` for you. After bootstrap, pushes and future clones will use SSH automatically.

The bootstrap runs eight steps in order:

| Step | Script | What it does | Sudo? |
| --- | --- | --- | --- |
| 1 | `00-xcode.sh` | Install Xcode Command Line Tools | No |
| 2 | `01-brew.sh` | Install Homebrew, run `brew bundle` (~90 packages) | Yes |
| 3 | `02-stow.sh` | Symlink all configs from `stow/` into `$HOME` | No |
| 4 | `03-1password.sh` | Sign in to 1Password CLI, verify SSH agent | No |
| 5 | `04-shell.sh` | Set fish as default shell, install Fisher plugins | Yes |
| 6 | `05-tools.sh` | Install mise runtimes (Node, Python, Erlang, Elixir, pnpm, uv) | No |
| 7 | `06-mas.sh` | Install Mac App Store apps | No |
| 8 | `07-macos.sh` | Apply ~80 system defaults (Finder, Dock, keyboard, etc.) | Yes |

You'll be prompted for your computer name during step 8 (defaults to `ewa-mbp`).

Expect ~15–30 minutes. The Erlang compile is the slowest part.

### After bootstrap

**Restart your Mac.** Keyboard repeat rate, hot corners, and several system defaults won't take effect until you do.

Then handle the things that can't be automated:

**Enable the 1Password SSH agent** — open 1Password → Settings → Developer → "Use the SSH agent". The bootstrap already configured `~/.ssh/config` to point to it. Once enabled, switch your dotfiles remote to SSH:

```bash
cd ~/Projects/dotfiles
git remote set-url origin git@github.com:ewilliam/dotfiles.git
```

**Authenticate the GitHub CLI** — the bootstrap installs `gh` but doesn't log in. Sign in to both accounts:

```bash
gh auth login          # follow the prompts for ewilliam
gh auth login          # follow the prompts for ewilliam-csd
```

Once both accounts are added, switch between them anytime with the fish helpers:

```fish
ghme   # switch to ewilliam  (ping@ewilli.am)
ghcsd  # switch to ewilliam-csd (walbright@csd.org)
ghwho  # show current user
```

This updates both `gh auth` and `git config --global` (user.name, user.email, github.user) in one step. The `.gitconfig` is also wired to use `gh auth git-credential` for HTTPS pushes, so once you're logged in credentials just work.

**Populate `~/.secrets.fish`** — the bootstrap creates this file empty. Add API keys and tokens your tools need:

```fish
set -gx ANTHROPIC_API_KEY "sk-ant-..."
set -gx OPENAI_API_KEY "sk-..."
```

**Set up aerc email** — copy the template and fill in your credentials:

```bash
cp ~/.config/aerc/accounts.conf.template ~/.config/aerc/accounts.conf
$EDITOR ~/.config/aerc/accounts.conf
```

The template uses `op item get` to pull passwords from 1Password at runtime.

**Grant macOS permissions** — you'll get prompted on first launch, but proactively grant these in System Settings → Privacy & Security:

| Permission | Apps |
| --- | --- |
| Accessibility | Hammerspoon, Karabiner-Elements, Raycast |
| Input Monitoring | Karabiner-Elements |
| Full Disk Access | Ghostty |
| Screen Recording | Hammerspoon |

**Sign into apps** that need manual authentication: Arc, Chrome, Firefox, Slack, Discord, Teams, Dropbox, Backblaze, Notion, Obsidian, Steam, ChatGPT, Claude.

**Re-pin Dock apps** — the bootstrap clears all pinned Dock apps for a clean slate. Drag back whatever you want, or leave it empty and let running apps fill it.

## Update

```bash
cd ~/Projects/dotfiles
git pull
bash bootstrap.sh
```

## AI tooling

Relay is a Bun + TypeScript CLI for running implementation plans one slice at a time. `relay install` restows the `relay` package, which manages `~/.local/bin/relay` and `~/.agents/skills/relay-plan`; the package's bin entry points to `tools/relay/bin/relay.ts`.

Common commands:

```bash
relay lint-plan --repo ~/Projects/dotfiles --plan docs/plans/2026-05-21-relay.md
relay --repo ~/Projects/dotfiles --plan docs/plans/2026-05-21-relay.md --verify "bun test tools/relay/test"
relay install
```

## Structure

```
.
├── bootstrap.sh          # entry point
├── Brewfile              # homebrew dependencies
├── setup/
│   ├── lib.sh            # shared helpers (logging, spinner)
│   ├── 00-xcode.sh       # xcode command line tools
│   ├── 01-brew.sh        # homebrew + brew bundle
│   ├── 02-stow.sh        # gnu stow symlinks
│   ├── 03-1password.sh   # 1password cli + ssh agent
│   ├── 04-shell.sh       # fish shell + fisher plugins
│   ├── 05-tools.sh       # mise runtimes
│   ├── 06-mas.sh         # mac app store
│   └── 07-macos.sh       # macos system defaults
└── stow/                 # symlinked configs
    ├── aerc/
    ├── fish/
    ├── ghostty/
    ├── git/
    ├── hammerspoon/
    ├── karabiner/
    ├── newsboat/
    ├── nvim/
    ├── pianobar/
    ├── readline/
    ├── ssh/
    ├── tmux/
    └── zed/
```

## Key bindings

Vi keybindings everywhere: fish, readline, neovim, zed, aerc, newsboat, tmux.

### Hammerspoon

| Binding | Action |
| --- | --- |
| `Cmd+Alt + H/J/K/L` | Push window left/down/up/right |
| `Cmd+Alt + Y/U/I/O` | Smart resize left/down/up/right |
| `Cmd+Alt + M` | Maximize window |
| `Cmd+Alt + F` | Toggle fullscreen |
| `Cmd+Alt + [ / ]` | Decrease / increase grid |
| `Ctrl+Space` then key | Launch app — **a**rc, **c**hrome, **d**ash, **e**=zed, **f**inder, **g**=tower, **m**essages, **s**afari, **t**=ghostty |

### Karabiner

| Binding | Action |
| --- | --- |
| `Caps Lock` hold | Control |
| `Caps Lock` tap | Escape |
| `Fn + I/J/K/L` | Arrow keys (up/left/down/right) |

### Fish abbreviations (highlights)

| Abbr | Expands to |
| --- | --- |
| `vi` | `nvim` |
| `cc` | `claude` |
| `cx` | `codex` |
| `oc` | `opencode` |
| `lzg` | `lazygit` |
| `gst` | `git status` |
| `gco` | `git checkout` |
| `pnd` | `pnpm dev` |
| `muxn` | `tmux new-session -s` |
| `frl` | reload fish config |
| `emacs` | `echo lmao` |
