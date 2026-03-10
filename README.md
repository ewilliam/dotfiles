# dat dotfiles

macOS dotfiles managed with [GNU Stow](https://www.gnu.org/software/stow/) and [Homebrew](https://brew.sh/).
Safe to re-run anytime -- every step is idempotent.

## What's inside

| Category | Configs |
| --- | --- |
| **Shell** | fish, readline |
| **Git** | git, delta |
| **Editor** | neovim, zed |
| **Terminal** | ghostty, tmux |
| **Email** | aerc, isync, msmtp, notmuch |
| **AI** | claude, codex, opencode |
| **Automation** | hammerspoon, karabiner |
| **Media** | newsboat, pianobar |

The bootstrap runs seven steps in order:

1. **Xcode** -- install Command Line Tools if missing
2. **Brew** -- install formulae & casks from `Brewfile`
3. **Stow** -- symlink dotfiles into `$HOME`
4. **Shell** -- set fish as default shell, install fisher plugins
5. **Tools** -- configure mise runtimes & neovim providers
6. **MAS** -- install Mac App Store apps
7. **macOS** -- apply system defaults (Finder, Dock, keyboard, etc.)

## Install

```bash
git clone https://github.com/ewilliam/dotfiles.git ~/Projects/dotfiles
cd ~/Projects/dotfiles
sh bootstrap.sh
```

## Update

```bash
cd ~/Projects/dotfiles
git pull
sh bootstrap.sh
```

## Structure

```
.
├── bootstrap.sh        # entry point
├── Brewfile            # homebrew dependencies
├── setup/
│   ├── lib.sh          # shared helpers (logging, spinner)
│   ├── 00-xcode.sh
│   ├── 01-brew.sh
│   ├── 02-stow.sh
│   ├── 03-shell.sh
│   ├── 04-tools.sh
│   ├── 05-mas.sh
│   └── 06-macos.sh
└── stow/               # symlinked configs
    ├── aerc/
    ├── fish/
    ├── git/
    ├── hammerspoon/
    ├── karabiner/
    ├── newsboat/
    ├── nvim/
    ├── pianobar/
    ├── readline/
    └── zed/
```
