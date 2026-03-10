# Bootstrap Rewrite Design

## Problem

The current `bootstrap.sh` has several issues:

- **No symlink management.** Bootstrap runs brew, mas, shell, tools, and macOS defaults but never creates symlinks. Only fish has linking via a manual `syncfish` function. Git, VS Code, pianobar, newsboat, and inputrc have no linking mechanism at all.
- **Diverged configs.** `~/.gitconfig`, VS Code settings, and pianobar config have drifted from repo versions.
- **Fragile env var gate.** Requiring `PROJECT_HOME`, `XDG_CONFIG_HOME`, and `MACOS_CONFIG_HOME` to be pre-set is a chicken-and-egg problem since those vars are defined in `fish/config.fish`, which hasn't been linked yet.
- **Not fully idempotent.** The brew step runs `brew bundle` on first install but only `update/upgrade/cleanup` on subsequent runs, missing new Brewfile additions.
- **No progress visibility.** Walls of text from subcommands with no structure.
- **`source` for sub-scripts.** Failures and state leak between steps.

## Goals

1. **Clean output with progress** -- Minimal but informative: step indicators, color, spinners. Know what's happening without noise.
2. **Single-command idempotent** -- Run one command anytime, system converges to correct state. Safe to re-run.
3. **Fast** -- Skip things already done. Minimize wall-clock time.

## Decisions

- **Language:** Bash. Bootstrap is a "run once, tweak rarely" orchestrator. Bash is the lingua franca, requires no two-stage dance (fish isn't available until after brew runs).
- **Symlink management:** GNU Stow. Convention-based, zero config, well-known tool. Directory structure mirrors target.
- **Script execution:** Sub-scripts are called (not sourced) for isolation.

## Architecture

### Directory Structure

```
dotfiles/
  bootstrap.sh              # Entry point (bash)
  setup/
    lib.sh                   # Shared: logging, spinners, step runner
    01-brew.sh               # Homebrew + brew bundle
    02-stow.sh               # GNU Stow: link all config packages
    03-shell.sh              # Fish shell setup
    04-tools.sh              # mise, neovim providers
    05-mas.sh                # Mac App Store apps
    06-macos.sh              # macOS defaults
  stow/                      # Stow packages
    fish/
      .config/fish/
        config.fish
        fish_plugins
        functions/
        conf.d/
    git/
      .gitconfig
    hammerspoon/
      .hammerspoon/
    karabiner/
      .config/karabiner/
    newsboat/
      .config/newsboat/
    pianobar/
      .config/pianobar/
    readline/
      .inputrc
    code/
      Library/Application Support/Code/User/
        settings.json
        keybindings.json
  Brewfile
```

Config files move under `stow/`, organized into packages where directory structure mirrors the target relative to `$HOME`. Running `stow -d stow -t ~ fish git hammerspoon ...` creates all symlinks automatically.

### setup/lib.sh

Shared library providing:
- `step "name" "description"` -- numbered step header with color
- `info`, `success`, `warn`, `error` -- colored log functions
- `spin "message" command args...` -- run command with spinner, show result
- `is_installed "cmd"` -- command existence check

### Step Scripts

**01-brew.sh**
- Install Homebrew if missing
- Always `brew bundle --file=Brewfile` (idempotent)
- `brew cleanup`
- Brewfile adds `stow`

**02-stow.sh**
- Iterate over `stow/` directories, run `stow --restow` for each
- `--restow` repairs stale links and creates missing ones
- Handle VS Code path with spaces

**03-shell.sh**
- Add fish to `/etc/shells` if needed
- `chsh` if not already default
- Install/update fisher and plugins
- Create `~/.secrets.fish` if missing

**04-tools.sh**
- mise: update plugins, install, set global node
- Neovim providers (pynvim, neovim gem)

**05-mas.sh**
- Install Mac App Store apps by ID (skips installed)

**06-macos.sh**
- Accept optional computer name argument
- All `defaults write` commands
- Restart Dock/Finder

### Output Style

```
dotfiles bootstrap
==================

[1/6] Homebrew
      + Homebrew installed
      . Installing packages from Brewfile...
      + 47 packages up to date, 3 installed

[2/6] Symlinks
      + fish -> ~/.config/fish
      + git -> ~/.gitconfig
      + hammerspoon -> ~/.hammerspoon
      ...

Done in 2m 34s
```

Verbose output suppressed unless error occurs (captured to log).

### Idempotency

Every step checks state before acting:
- `brew bundle` skips installed packages
- `stow --restow` fixes stale and creates missing links
- Shell setup checks `/etc/shells` and `$SHELL`
- `mise install` skips current versions
- `mas install` skips installed apps
- `defaults write` overwrites to same value

### What Gets Removed

- `syncfish` fish function (replaced by stow)
- Env var gate in bootstrap (bootstrap defines its own paths)
- Top-level config dirs (`fish/`, `git/`, `hammerspoon/`, `karabiner/`, `newsboat/`, `pianobar/`, `inputrc`, `Code/`) -- all move under `stow/`

### Migration

1. Move configs into `stow/` package structure via `git mv`
2. Remove existing manual symlinks before stow takes over
3. Resolve diverged configs (git, VS Code, pianobar) -- decide which version to keep
4. Add `stow` to Brewfile
5. Clean up stale fish symlinks
