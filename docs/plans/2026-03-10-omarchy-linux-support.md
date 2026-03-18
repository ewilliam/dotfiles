# Omarchy Linux Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing dotfiles repo cross-platform so that a single `bootstrap.sh` works on both macOS and Omarchy Linux (Arch), producing the same Fish + Neovim + Git + tmux + terminal experience on both.

**Architecture:** Add OS detection to the bootstrap entry point, create Linux-specific setup scripts alongside macOS ones, and make stow configs cross-platform with conditional logic where needed. Omarchy is installed first from its ISO; our bootstrap layers on top. Stow configs override Omarchy defaults (with backups).

**Tech Stack:** Bash, Fish, GNU Stow, pacman/yay (Arch), Hyprland (Omarchy default WM)

**Key Decisions:**
- Shell: Fish on both platforms
- WM/keybinds: Use Omarchy's Hyprland defaults (skip Hammerspoon/Karabiner on Linux)
- Config conflicts: Stow overrides Omarchy, with backups of originals
- tmux/Ghostty: Use Omarchy defaults, no stow packages needed
- Git credentials: 1Password CLI (`op`) on Linux, osxkeychain on macOS
- Repo strategy: Single cross-platform repo with OS detection

---

## Phase 1: Bootstrap Infrastructure

### Task 1: Add OS detection to `setup/lib.sh`

**Files:**
- Modify: `setup/lib.sh`

Add platform detection variables after the existing `set -euo pipefail` line, before the Colors section. All subsequent scripts will use these to branch behavior.

**Add this block:**

```bash
# ── Platform ────────────────────────────────────────────────────────
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"   # darwin | linux
DISTRO="unknown"
if [[ "$OS" == "linux" ]]; then
    if [[ -f /etc/os-release ]]; then
        DISTRO=$(. /etc/os-release && echo "${ID:-unknown}")  # arch, ubuntu, etc.
    fi
fi
is_macos() { [[ "$OS" == "darwin" ]]; }
is_linux() { [[ "$OS" == "linux" ]]; }
is_arch()  { [[ "$DISTRO" == "arch" ]]; }
```

**Step 1:** Add the platform block to `setup/lib.sh` at line 5 (after `set -euo pipefail`, before Colors).

**Step 2:** Verify by running: `bash -c 'source setup/lib.sh && echo "OS=$OS DISTRO=$DISTRO"'`
Expected on macOS: `OS=darwin DISTRO=unknown`

**Step 3:** Commit.
```bash
git add setup/lib.sh
git commit -m "feat: add OS/distro detection to shared lib"
```

---

### Task 2: Make `bootstrap.sh` OS-aware step dispatch

**Files:**
- Modify: `bootstrap.sh`

Replace the hardcoded 7-step macOS sequence with conditional step sourcing. The step mapping:

| Step | macOS | Linux |
|------|-------|-------|
| 1 | `00-xcode.sh` (Xcode CLT) | skip |
| 2 | `01-brew.sh` (Homebrew) | `01-pacman.sh` (pacman/yay) |
| 3 | `02-stow.sh` (symlinks) | `02-stow.sh` (same) |
| 4 | `03-shell.sh` (fish) | `03-shell.sh` (same, but patched) |
| 5 | `04-tools.sh` (mise) | `04-tools.sh` (same) |
| 6 | `05-mas.sh` (App Store) | skip |
| 7 | `06-macos.sh` (defaults) | `06-linux.sh` (systemd/settings) |

**Step 1:** Rewrite `bootstrap.sh` to use conditional sourcing:

```bash
#!/usr/bin/env bash
#
# Bootstrap a fresh macOS or Omarchy Linux machine, or update an existing one.
# Safe to re-run anytime -- every step is idempotent.
#

set -euo pipefail

DOTFILES="$(cd "$(dirname "$0")" && pwd)"
source "$DOTFILES/setup/lib.sh"

START_TIME=$SECONDS

printf "\n${BOLD}dotfiles bootstrap${RESET}\n"
printf "==================\n"
info "Platform: $OS ($DISTRO)"

if is_macos; then
    STEP_TOTAL=7
    source "$DOTFILES/setup/00-xcode.sh"
    source "$DOTFILES/setup/01-brew.sh"
    source "$DOTFILES/setup/02-stow.sh"
    source "$DOTFILES/setup/03-shell.sh"
    source "$DOTFILES/setup/04-tools.sh"
    source "$DOTFILES/setup/05-mas.sh"
    source "$DOTFILES/setup/06-macos.sh"
elif is_linux; then
    STEP_TOTAL=5
    source "$DOTFILES/setup/01-pacman.sh"
    source "$DOTFILES/setup/02-stow.sh"
    source "$DOTFILES/setup/03-shell.sh"
    source "$DOTFILES/setup/04-tools.sh"
    source "$DOTFILES/setup/06-linux.sh"
else
    error "Unsupported platform: $OS"
    exit 1
fi

elapsed=$(( SECONDS - START_TIME ))
minutes=$(( elapsed / 60 ))
seconds=$(( elapsed % 60 ))

printf "\n${GREEN}${BOLD}Done${RESET} in %dm %ds\n\n" "$minutes" "$seconds"
```

**Step 2:** Verify existing macOS path still works: `bash bootstrap.sh` (should behave identically).

**Step 3:** Commit.
```bash
git add bootstrap.sh
git commit -m "feat: make bootstrap OS-aware with conditional step dispatch"
```

---

### Task 3: Create `setup/01-pacman.sh` and `Pacfile`

**Files:**
- Create: `Pacfile`
- Create: `setup/01-pacman.sh`

The `Pacfile` lists packages in two sections: `[pacman]` for official repos and `[aur]` for AUR packages. This mirrors the `Brewfile` structure.

**Step 1:** Create `Pacfile`:

```ini
# Official repository packages (pacman)
[pacman]
# Shell
fish
direnv
grc
hyperfine
stow
tldr
trash-cli
yazi
zoxide

# Git
github-cli
git-lfs

# Search
ugrep

# Dev Tools
imagemagick
jq
openssl

# Database
postgresql
redis
sqlite

# Download
yt-dlp

# Email
aerc
isync
msmtp
notmuch
elinks
urlscan

# Media
newsboat

# AUR packages (yay)
[aur]
# AI
claude-code-cli
opencode

# Download
curlie

# Media
pianobar

# Editor
zed-editor
```

**Step 2:** Create `setup/01-pacman.sh`:

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Packages (pacman/yay)"

if ! is_arch; then
    warn "Skipping -- not Arch Linux"
    return 0 2>/dev/null || exit 0
fi

# Ensure yay is available (Omarchy ships it)
if ! is_installed yay; then
    error "yay not found -- install Omarchy first"
    return 1 2>/dev/null || exit 1
fi

pacfile="$DOTFILES/Pacfile"

if [[ ! -f "$pacfile" ]]; then
    error "Pacfile not found at $pacfile"
    return 1 2>/dev/null || exit 1
fi

# Parse Pacfile sections
pacman_pkgs=()
aur_pkgs=()
current_section=""

while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    # Detect section headers
    if [[ "$line" == "[pacman]" ]]; then
        current_section="pacman"
        continue
    elif [[ "$line" == "[aur]" ]]; then
        current_section="aur"
        continue
    fi
    # Add to appropriate list
    case "$current_section" in
        pacman) pacman_pkgs+=("$line") ;;
        aur)    aur_pkgs+=("$line") ;;
    esac
done < "$pacfile"

# Install official repo packages
if [[ ${#pacman_pkgs[@]} -gt 0 ]]; then
    spin "Installing pacman packages" sudo pacman -S --needed --noconfirm "${pacman_pkgs[@]}"
fi

# Install AUR packages
if [[ ${#aur_pkgs[@]} -gt 0 ]]; then
    spin "Installing AUR packages" yay -S --needed --noconfirm "${aur_pkgs[@]}"
fi

# System update
spin "Updating system" sudo pacman -Syu --noconfirm
```

**Step 3:** Make executable: `chmod +x setup/01-pacman.sh`

**Step 4:** Commit.
```bash
git add Pacfile setup/01-pacman.sh
git commit -m "feat: add pacman/yay package installer for Arch Linux"
```

**Notes:**
- Packages Omarchy already provides (skip in Pacfile): neovim, bat, btop, dust, eza, fd, fzf, ripgrep, tmux, ghostty, git, delta, lazygit, mise, jj, docker, coreutils.
- The AUR package names may need verification on a live Omarchy system. Run `yay -Ss <name>` to confirm exact names.
- The `--noconfirm` flag makes this non-interactive for automation.

---

### Task 4: Create `setup/06-linux.sh` (Linux system defaults)

**Files:**
- Create: `setup/06-linux.sh`

Linux equivalent of `06-macos.sh`. Intentionally lightweight since Omarchy handles most system config during its own install.

**Step 1:** Create `setup/06-linux.sh`:

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Linux Defaults"

if ! is_linux; then
    info "Skipping (not Linux)"
    return 0 2>/dev/null || exit 0
fi

COMPUTER_NAME="${1:-ewa-omarchy}"

info "Computer name: $COMPUTER_NAME"

# ── Hostname ────────────────────────────────────────────────────────
if [[ "$(hostname)" != "$COMPUTER_NAME" ]]; then
    sudo hostnamectl set-hostname "$COMPUTER_NAME"
    success "Hostname set to $COMPUTER_NAME"
else
    success "Hostname already $COMPUTER_NAME"
fi

# ── Timezone ────────────────────────────────────────────────────────
current_tz=$(timedatectl show -p Timezone --value 2>/dev/null || echo "")
if [[ "$current_tz" != "America/Los_Angeles" ]]; then
    sudo timedatectl set-timezone "America/Los_Angeles"
    success "Timezone set to America/Los_Angeles"
else
    success "Timezone already America/Los_Angeles"
fi

# ── NTP ─────────────────────────────────────────────────────────────
sudo timedatectl set-ntp true 2>/dev/null
success "NTP enabled"

# ── File watchers (Omarchy may already set this) ────────────────────
WATCHER_CONF="/etc/sysctl.d/99-file-watchers.conf"
if [[ ! -f "$WATCHER_CONF" ]] || ! grep -q "524288" "$WATCHER_CONF" 2>/dev/null; then
    echo "fs.inotify.max_user_watches=524288" | sudo tee "$WATCHER_CONF" > /dev/null
    sudo sysctl -p "$WATCHER_CONF" > /dev/null 2>&1
    success "File watcher limit increased"
else
    success "File watcher limit already set"
fi

# ── Swappiness ──────────────────────────────────────────────────────
SWAP_CONF="/etc/sysctl.d/99-swappiness.conf"
if [[ ! -f "$SWAP_CONF" ]] || ! grep -q "swappiness=10" "$SWAP_CONF" 2>/dev/null; then
    echo "vm.swappiness=10" | sudo tee "$SWAP_CONF" > /dev/null
    sudo sysctl -p "$SWAP_CONF" > /dev/null 2>&1
    success "Swappiness set to 10"
else
    success "Swappiness already configured"
fi

# ── Enable services ─────────────────────────────────────────────────
services=(bluetooth cups docker)
for svc in "${services[@]}"; do
    if systemctl list-unit-files "${svc}.service" &>/dev/null; then
        if ! systemctl is-enabled --quiet "$svc" 2>/dev/null; then
            sudo systemctl enable --now "$svc"
            success "Enabled $svc"
        else
            success "$svc already enabled"
        fi
    else
        info "Service $svc not found, skipping"
    fi
done

# ── Git credential helper (1Password CLI) ──────────────────────────
GIT_CONFIG_LOCAL="$HOME/.config/git/config.local"
mkdir -p "$(dirname "$GIT_CONFIG_LOCAL")"
if [[ ! -f "$GIT_CONFIG_LOCAL" ]] || ! grep -q "credential" "$GIT_CONFIG_LOCAL" 2>/dev/null; then
    cat > "$GIT_CONFIG_LOCAL" << 'EOF'
[credential]
    helper = /opt/1Password/op-ssh-sign
[gpg]
    format = ssh
[gpg "ssh"]
    program = /opt/1Password/op-ssh-sign
EOF
    success "Git credential helper configured (1Password CLI)"
else
    success "Git credential helper already configured"
fi

success "Linux defaults applied"
```

**Step 2:** Make executable: `chmod +x setup/06-linux.sh`

**Step 3:** Commit.
```bash
git add setup/06-linux.sh
git commit -m "feat: add Linux system defaults script"
```

**Notes:**
- The 1Password CLI credential helper path (`/opt/1Password/op-ssh-sign`) should be verified on the actual Omarchy installation. It may differ -- check with `which op` or `ls /opt/1Password/`.
- Omarchy's own install already configures docker, file watchers, etc. This script acts as an idempotent safety net.

---

## Phase 2: Cross-Platform Stow Configs

### Task 5: Make `fish/config.fish` cross-platform

**Files:**
- Modify: `stow/fish/.config/fish/config.fish`

**Step 1:** Rewrite `config.fish` with platform-conditional blocks:

```fish
set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects

fish_vi_key_bindings

# Platform-specific paths
switch (uname)
    case Darwin
        fish_add_path /opt/homebrew/sbin
        set -gx PNPM_HOME $HOME/Library/pnpm
    case Linux
        set -gx PNPM_HOME $HOME/.local/share/pnpm
end
fish_add_path $PNPM_HOME

# mise runtime manager
if command -q mise
    mise activate fish | source
end

# direnv
if command -q direnv
    direnv hook fish | source
end

# zoxide directory jumper (aliased to j)
if command -q zoxide
    zoxide init --cmd j fish | source
end

# jj
if command -q jj
    jj util completion fish | source
end

# claude
fish_add_path $HOME/.local/bin

# orbstack (macOS only)
if test (uname) = Darwin
    source ~/.orbstack/shell/init2.fish 2>/dev/null; or :
end

# secrets (API keys, tokens, etc.)
source ~/.secrets.fish 2>/dev/null; or :
```

**Step 2:** Verify fish config loads without error on macOS: `fish -c 'source ~/.config/fish/config.fish; echo ok'`

**Step 3:** Commit.
```bash
git add stow/fish/.config/fish/config.fish
git commit -m "feat: make fish config.fish cross-platform"
```

**Notes:**
- Added `command -q` guards around all tool activations. This makes the config resilient even if a tool isn't installed yet.
- The `switch (uname)` pattern is the idiomatic Fish way to branch on platform.

---

### Task 6: Make `fish/abbreviations.fish` cross-platform

**Files:**
- Modify: `stow/fish/.config/fish/conf.d/abbreviations.fish`

**Step 1:** Wrap macOS-specific abbreviations (lines 26-31) in a platform guard and add Linux equivalents:

Replace the "System specific (Mac)" section with:

```fish
# System specific
switch (uname)
    case Darwin
        abbr -a -- showFiles 'defaults write com.apple.finder AppleShowAllFiles TRUE && killall Finder'
        abbr -a -- hideFiles 'defaults write com.apple.finder AppleShowAllFiles FALSE && killall Finder'
        abbr -a -- flushdns 'sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder'
        abbr -a -- emptyDock 'defaults write com.apple.dock persistent-apps -array; defaults write com.apple.dock persistent-others -array; killall Dock'
        abbr -a -- brewu 'brew update && brew upgrade && brew upgrade --cask && brew cleanup && brew doctor'
    case Linux
        abbr -a -- flushdns 'sudo systemd-resolve --flush-caches'
        abbr -a -- pacu 'sudo pacman -Syu && yay -Sua'
        abbr -a -- pacq 'pacman -Ss'
        abbr -a -- paci 'sudo pacman -S'
        abbr -a -- pacr 'sudo pacman -Rns'
end
```

Also move the `brewu` abbreviation (line 60) into the Darwin case above (it's currently in "Package managers" section but is macOS-only).

**Step 2:** Verify: `fish -c 'source ~/.config/fish/conf.d/abbreviations.fish; echo ok'`

**Step 3:** Commit.
```bash
git add stow/fish/.config/fish/conf.d/abbreviations.fish
git commit -m "feat: make fish abbreviations cross-platform"
```

---

### Task 7: Make `fish/upall.fish` cross-platform

**Files:**
- Modify: `stow/fish/.config/fish/functions/upall.fish`

**Step 1:** Add pacman/yay sections after the Homebrew section (after line 52). The existing `command -q brew` guard means Homebrew naturally skips on Linux. Add:

```fish
    # --- pacman (Arch) ---
    if command -q pacman
        _upall_header Pacman
        _upall_run "Syncing repos" sudo pacman -Sy
            and set -a passed pacman:sync
            or set -a failed pacman:sync
        _upall_run "Upgrading packages" sudo pacman -Su --noconfirm
            and set -a passed pacman:upgrade
            or set -a failed pacman:upgrade
    else
        set -a skipped pacman
    end

    # --- yay (AUR) ---
    if command -q yay
        _upall_header "AUR (yay)"
        _upall_run "Updating AUR packages" yay -Sua --noconfirm
            and set -a passed yay:update
            or set -a failed yay:update
    else
        set -a skipped yay
    end
```

**Step 2:** The existing `mas` and `fisher` sections already use `command -q` guards, so they'll skip naturally on Linux. No changes needed there.

**Step 3:** Commit.
```bash
git add stow/fish/.config/fish/functions/upall.fish
git commit -m "feat: add pacman/yay support to upall function"
```

---

### Task 8: Make `fish/clearcache.fish` cross-platform

**Files:**
- Modify: `stow/fish/.config/fish/functions/clearcache.fish`

**Step 1:** Wrap the entire function body in a `switch (uname)` block. The existing macOS code goes under `case Darwin`. Add a `case Linux` branch:

```fish
function clearcache -d "Clear system caches"
    switch (uname)
        case Linux
            echo "Clearing user cache (~/.cache)..."
            if test -d ~/.cache
                command rm -rf ~/.cache/*
                echo "  Cleared."
            else
                echo "  No cache directory found."
            end

            echo ""
            echo "Flushing DNS cache..."
            sudo systemd-resolve --flush-caches 2>/dev/null
            or sudo resolvectl flush-caches 2>/dev/null
            or echo "  Could not flush DNS (no systemd-resolved?)"

            # Optional: drop page cache (requires confirmation)
            echo ""
            read -P "Drop kernel page cache? (requires sudo) [y/N] " confirm
            if string match -qi 'y' $confirm
                sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
                echo "  Page cache dropped."
            end

            echo "Cache clearing complete!"

        case Darwin
            # ... existing macOS implementation (keep as-is) ...
    end
end
```

Specifically: keep the entire existing function body (lines 2-76) intact under `case Darwin`, and add the Linux branch above it.

**Step 2:** Commit.
```bash
git add stow/fish/.config/fish/functions/clearcache.fish
git commit -m "feat: add Linux support to clearcache function"
```

---

### Task 9: Make `fish/rm.fish` cross-platform

**Files:**
- Modify: `stow/fish/.config/fish/functions/rm.fish`

**Step 1:** Replace the hardcoded "trash" message with detection of the available trash command. On Linux (trash-cli), the command is `trash-put`:

```fish
function rm -d "Prevent accidental rm usage; use trash instead"
    if contains -- --force $argv; or contains -- -f $argv
        command rm $argv
        return $status
    end

    set -l trash_cmd
    if command -q trash
        set trash_cmd trash
    else if command -q trash-put
        set trash_cmd trash-put
    end

    if test -n "$trash_cmd"
        echo "Use '$trash_cmd' instead of 'rm'. Pass --force or -f to bypass." >&2
    else
        echo "Use trash instead of 'rm' (install 'trash' or 'trash-cli'). Pass --force or -f to bypass." >&2
    end
    return 1
end
```

**Step 2:** Commit.
```bash
git add stow/fish/.config/fish/functions/rm.fish
git commit -m "feat: make rm guard cross-platform (trash vs trash-put)"
```

---

### Task 10: Make `.gitconfig` cross-platform

**Files:**
- Modify: `stow/git/.gitconfig`

**Step 1:** Replace the hardcoded `[credential] helper = osxkeychain` with an include for a platform-specific local config:

Remove:
```gitconfig
[credential]
  helper = osxkeychain
```

Add at the end of the file:
```gitconfig
[include]
  path = ~/.config/git/config.local
```

**Step 2:** The bootstrap scripts handle creating `~/.config/git/config.local`:
- On macOS: `06-macos.sh` will write `helper = osxkeychain` (add this step to 06-macos.sh)
- On Linux: `06-linux.sh` already writes the 1Password CLI config (see Task 4)

Add to `setup/06-macos.sh` (before the "Restart affected apps" section):

```bash
# ── Git credential helper ──────────────────────────────────────────
GIT_CONFIG_LOCAL="$HOME/.config/git/config.local"
mkdir -p "$(dirname "$GIT_CONFIG_LOCAL")"
if [[ ! -f "$GIT_CONFIG_LOCAL" ]] || ! grep -q "credential" "$GIT_CONFIG_LOCAL" 2>/dev/null; then
    cat > "$GIT_CONFIG_LOCAL" << 'EOF'
[credential]
    helper = osxkeychain
EOF
    success "Git credential helper configured (osxkeychain)"
else
    success "Git credential helper already configured"
fi
```

**Step 3:** Add `config.local` to the git global ignore (it's machine-specific, shouldn't be committed):

The file `stow/git/.config/git/ignore` should get a line:
```
config.local
```

**Step 4:** Commit.
```bash
git add stow/git/.gitconfig setup/06-macos.sh stow/git/.config/git/ignore
git commit -m "feat: make git credential helper platform-specific via config.local"
```

---

### Task 11: Make `03-shell.sh` cross-platform

**Files:**
- Modify: `setup/03-shell.sh`

**Step 1:** Replace the `brew --prefix` fish path with platform detection:

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Shell"

# Find fish binary
if is_macos; then
    fish_path="$(brew --prefix)/bin/fish"
elif is_linux; then
    fish_path="/usr/bin/fish"
else
    fish_path="$(command -v fish 2>/dev/null || echo "/usr/bin/fish")"
fi

if [[ ! -x "$fish_path" ]]; then
    error "Fish not found at $fish_path"
    return 1 2>/dev/null || exit 1
fi

# Add fish to allowed shells
if ! grep -Fxq "$fish_path" /etc/shells; then
    echo "$fish_path" | sudo tee -a /etc/shells > /dev/null
    success "Added fish to /etc/shells"
else
    success "Fish already in /etc/shells"
fi

# Set fish as default shell
if [[ "$SHELL" != "$fish_path" ]]; then
    chsh -s "$fish_path"
    success "Default shell set to fish"
else
    success "Fish already default shell"
fi

# Create secrets file
if [[ ! -f "$HOME/.secrets.fish" ]]; then
    touch "$HOME/.secrets.fish"
    success "Created ~/.secrets.fish"
fi

# Install/update fisher and plugins
spin "Updating fisher plugins" fish -c '
    if not functions -q fisher
        curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher
    end
    fisher update
'
```

**Step 2:** Verify on macOS: `bash setup/03-shell.sh` (should behave identically).

**Step 3:** Commit.
```bash
git add setup/03-shell.sh
git commit -m "feat: make shell setup cross-platform"
```

**Notes:**
- On Omarchy, `chsh` may require the user's password. This is expected and the script will prompt for it.
- Omarchy uses bash by default. After running this, fish becomes the default shell. The user should log out and back in for it to take effect.

---

### Task 12: Make `02-stow.sh` handle Omarchy config conflicts

**Files:**
- Modify: `setup/02-stow.sh`

**Step 1:** Add a pre-stow backup step for Linux. Before the stow loop, back up any Omarchy-installed configs that would conflict with our stow packages:

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Symlinks"

stow_dir="$DOTFILES/stow"

# On Linux, back up Omarchy configs that our stow packages will override
if is_linux; then
    for package in "$stow_dir"/*/; do
        name=$(basename "$package")

        # Find what paths this stow package would create
        while IFS= read -r -d '' rel_path; do
            target="$HOME/$rel_path"
            if [[ -e "$target" && ! -L "$target" ]]; then
                backup="${target}.omarchy-backup"
                if [[ ! -e "$backup" ]]; then
                    mv "$target" "$backup"
                    info "Backed up $target -> $backup"
                fi
            fi
        done < <(cd "$package" && find . -type f -print0 | sed -z 's|^\./||')
    done
fi

# Packages to skip per platform
skip_linux="hammerspoon karabiner"

for package in "$stow_dir"/*/; do
    name=$(basename "$package")

    # Skip platform-specific packages
    if is_linux && echo "$skip_linux" | grep -qw "$name"; then
        info "$name (skipped, macOS only)"
        continue
    fi

    if stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null; then
        success "$name"
    else
        if stow -d "$stow_dir" -t "$HOME" --adopt "$name" 2>/dev/null; then
            stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null
            warn "$name (adopted existing files)"
        else
            error "$name"
        fi
    fi
done
```

**Step 2:** Verify on macOS: `bash setup/02-stow.sh` (should behave identically -- `is_linux` guard skips the backup, no packages are skipped).

**Step 3:** Commit.
```bash
git add setup/02-stow.sh
git commit -m "feat: handle Omarchy config conflicts and skip macOS-only packages"
```

**Notes:**
- This combines Tasks 12 and 13 from the original plan (backup + skip logic in one script).
- The backup uses `.omarchy-backup` suffix. If the backup already exists, it's left alone (idempotent).
- `hammerspoon` and `karabiner` are skipped on Linux since Omarchy's Hyprland keybinds handle window/key management.

---

### Task 13: Make `04-tools.sh` cross-platform

**Files:**
- Modify: `setup/04-tools.sh`

The script already works cross-platform (mise is the same on both) but could be more defensive. No changes strictly required, but worth adding a guard in case mise wasn't installed:

**Step 1:** Verify that the existing script works as-is on Linux. The only concern is `mise` being available -- on Omarchy it's installed by the Omarchy installer, and on macOS by Homebrew. The script already checks `is_installed mise`.

**Step 2:** If no changes needed, skip. Otherwise, minor cleanup only.

**Step 3:** Commit if changed.

---

## Phase 3: Polish

### Task 14: Update git global ignore with Linux patterns

**Files:**
- Modify: `stow/git/.config/git/ignore`

**Step 1:** Add Linux-specific patterns at the end (before the final "End of" comment):

```gitignore
### Linux ###
*~
.fuse_hidden*
.directory
.Trash-*
.nfs*
```

**Step 2:** Commit.
```bash
git add stow/git/.config/git/ignore
git commit -m "chore: add Linux ignore patterns to global gitignore"
```

---

### Task 15: Update `README.md`

**Files:**
- Modify: `README.md`

**Step 1:** Rewrite the README to document both platforms:

```markdown
# dat dotfiles

Cross-platform dotfiles for macOS and [Omarchy Linux](https://omarchy.org),
managed with [GNU Stow](https://www.gnu.org/software/stow/).
Safe to re-run anytime -- every step is idempotent.

## What's inside

| Category | Configs | Platforms |
| --- | --- | --- |
| **Shell** | fish, readline | both |
| **Git** | git, delta | both |
| **Editor** | neovim, zed | both |
| **Terminal** | ghostty, tmux | both (Omarchy defaults on Linux) |
| **Email** | aerc, isync, msmtp, notmuch | both |
| **AI** | claude, codex, opencode | both |
| **Automation** | hammerspoon, karabiner | macOS only |
| **Media** | newsboat, pianobar | both |

## Install

### macOS

```bash
git clone https://github.com/ewilliam/dotfiles.git ~/Projects/dotfiles
cd ~/Projects/dotfiles
sh bootstrap.sh
```

### Omarchy Linux

Install [Omarchy](https://omarchy.org) first from the ISO, then:

```bash
git clone https://github.com/ewilliam/dotfiles.git ~/Projects/dotfiles
cd ~/Projects/dotfiles
sh bootstrap.sh
```

The bootstrap detects the OS and runs the appropriate steps.

## Update

```bash
cd ~/Projects/dotfiles
git pull
sh bootstrap.sh
```

## Structure

```
.
├── bootstrap.sh        # entry point (OS-aware)
├── Brewfile            # homebrew dependencies (macOS)
├── Pacfile             # pacman/AUR dependencies (Linux)
├── setup/
│   ├── lib.sh          # shared helpers (logging, spinner, OS detection)
│   ├── 00-xcode.sh     # macOS: Xcode CLT
│   ├── 01-brew.sh      # macOS: Homebrew
│   ├── 01-pacman.sh    # Linux: pacman/yay
│   ├── 02-stow.sh      # both: symlink configs
│   ├── 03-shell.sh     # both: fish shell setup
│   ├── 04-tools.sh     # both: mise runtimes
│   ├── 05-mas.sh       # macOS: Mac App Store
│   ├── 06-macos.sh     # macOS: system defaults
│   └── 06-linux.sh     # Linux: system defaults
└── stow/               # symlinked configs
    ├── aerc/
    ├── fish/
    ├── git/
    ├── hammerspoon/    # macOS only
    ├── karabiner/      # macOS only
    ├── newsboat/
    ├── nvim/
    ├── pianobar/
    ├── readline/
    └── zed/
```
```

**Step 2:** Commit.
```bash
git add README.md
git commit -m "docs: update README for cross-platform support"
```

---

### Task 16: Add `.omarchy-backup` to `.gitignore`

**Files:**
- Modify: `.gitignore`

**Step 1:** Add `*.omarchy-backup` to the project `.gitignore`.

**Step 2:** Commit.
```bash
git add .gitignore
git commit -m "chore: ignore omarchy backup files"
```

---

## Execution Order

```
Phase 1 (infra):   Tasks 1 -> 2 -> 3 -> 4     (sequential, each builds on previous)
Phase 2 (configs): Tasks 5-13                   (mostly independent, can parallelize)
Phase 3 (polish):  Tasks 14-16                  (independent, can parallelize)
```

## Post-Install Verification Checklist

After running `bootstrap.sh` on the Omarchy box, verify:

- [ ] `fish` is the default shell (`echo $SHELL`)
- [ ] `fisher` plugins are installed (`fisher list`)
- [ ] Neovim opens and loads plugins (`nvim --headless +qa`)
- [ ] Git uses 1Password credential helper (`git config credential.helper`)
- [ ] `mise` runtimes are installed (`mise ls`)
- [ ] `aerc` can launch (email client)
- [ ] `newsboat`, `pianobar` work
- [ ] Abbreviations work (`gst` expands to `git status`)
- [ ] `upall` function runs and hits pacman/yay sections
- [ ] Stow symlinks are correct (`ls -la ~/.config/fish`)
- [ ] Omarchy Hyprland keybinds still work (Super+Enter for terminal, etc.)

## What This Plan Does NOT Change

- Hyprland config (using Omarchy defaults)
- tmux config (using Omarchy defaults)
- Ghostty config (using Omarchy defaults)
- Neovim config (already cross-platform Lua)
- aerc/newsboat/pianobar configs (already cross-platform)
