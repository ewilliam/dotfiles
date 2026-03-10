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
| **Automation** | hammerspoon, karabiner |
| **Media** | newsboat, pianobar |

The bootstrap runs six steps in order:

1. **Brew** -- install formulae & casks from `Brewfile`
2. **Stow** -- symlink dotfiles into `$HOME`
3. **Shell** -- set fish as default shell, install fisher plugins
4. **Tools** -- configure mise runtimes & neovim providers
5. **MAS** -- install Mac App Store apps
6. **macOS** -- apply system defaults (Finder, Dock, keyboard, etc.)

## Prerequisites

- macOS with Xcode Command Line Tools (`xcode-select --install`)
- `PROJECT_HOME`, `XDG_CONFIG_HOME`, and `MACOS_CONFIG_HOME` set in your environment

## Install

```bash
cd "$PROJECT_HOME"
git clone https://github.com/ewilliam/dotfiles.git
cd dotfiles
sh bootstrap.sh
```

## Update

```bash
cd "$PROJECT_HOME/dotfiles"
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
│   ├── 01-brew.sh
│   ├── 02-stow.sh
│   ├── 03-shell.sh
│   ├── 04-tools.sh
│   ├── 05-mas.sh
│   └── 06-macos.sh
└── stow/               # symlinked configs
    ├── fish/
    ├── git/
    ├── hammerspoon/
    ├── karabiner/
    ├── newsboat/
    ├── pianobar/
    └── readline/
```
