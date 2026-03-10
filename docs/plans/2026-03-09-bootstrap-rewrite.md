# Bootstrap Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the dotfiles bootstrap system to be idempotent, use GNU Stow for symlinks, and have clean progress output.

**Architecture:** Single bash entry point (`bootstrap.sh`) sources a shared library (`setup/lib.sh`) for colored output/spinners, then runs numbered step scripts under `setup/`. Config files live under `stow/` in packages that mirror target paths relative to `$HOME`. GNU Stow manages all symlinks.

**Tech Stack:** Bash, GNU Stow, Homebrew, Fish shell, mise

---

### Task 1: Add stow to Brewfile

**Files:**
- Modify: `Brewfile`

**Step 1: Add stow to Brewfile**

Add `brew "stow"` under the Shell section (after `brew "grc"`):

```
brew "stow"
```

**Step 2: Commit**

```bash
git add Brewfile
git commit -m "add stow to Brewfile"
```

---

### Task 2: Restructure configs into stow packages

Move all config directories into `stow/` with proper target-mirroring structure. This is the largest task -- it's all `git mv` operations.

**Files:**
- Move: `fish/` -> `stow/fish/.config/fish/`
- Move: `git/config` -> `stow/git/.gitconfig`
- Move: `git/gitignore` -> `stow/git/.config/git/ignore`
- Move: `hammerspoon/` -> `stow/hammerspoon/.hammerspoon/`
- Move: `karabiner/` -> `stow/karabiner/.config/karabiner/`
- Move: `newsboat/` -> `stow/newsboat/.config/newsboat/`
- Move: `pianobar/` -> `stow/pianobar/.config/pianobar/`
- Move: `inputrc` -> `stow/readline/.inputrc`
- Move: `Code/` -> `stow/code/Library/Application Support/Code/`

**Step 1: Create stow directory structure**

```bash
mkdir -p stow/fish/.config
mkdir -p stow/git/.config/git
mkdir -p stow/hammerspoon
mkdir -p stow/karabiner/.config
mkdir -p stow/newsboat/.config
mkdir -p stow/pianobar/.config
mkdir -p stow/readline
mkdir -p "stow/code/Library/Application Support"
```

**Step 2: Move fish configs**

```bash
git mv fish stow/fish/.config/fish
```

**Step 3: Move git configs**

Git config goes to `~/.gitconfig` (traditional location). The gitignore moves to the XDG-standard `~/.config/git/ignore` location. Update the excludesfile path in the config since stow will place it at `~/.gitconfig`.

```bash
git mv git/config stow/git/.gitconfig
git mv git/gitignore stow/git/.config/git/ignore
rmdir git
```

Then edit `stow/git/.gitconfig` to change the excludesfile line:

```
  excludesfile = ~/.config/git/ignore
```

This works because stow will create both `~/.gitconfig` and `~/.config/git/ignore` as symlinks.

**Step 4: Move hammerspoon configs**

```bash
git mv hammerspoon stow/hammerspoon/.hammerspoon
```

**Step 5: Move karabiner configs**

```bash
git mv karabiner stow/karabiner/.config/karabiner
```

**Step 6: Move newsboat configs**

```bash
git mv newsboat stow/newsboat/.config/newsboat
```

**Step 7: Move pianobar configs**

```bash
git mv pianobar stow/pianobar/.config/pianobar
```

**Step 8: Move inputrc**

```bash
git mv inputrc stow/readline/.inputrc
```

**Step 9: Move VS Code configs**

```bash
git mv Code "stow/code/Library/Application Support/Code"
```

**Step 10: Remove syncfish function**

Delete `stow/fish/.config/fish/functions/syncfish.fish` -- stow replaces it entirely.

```bash
git rm stow/fish/.config/fish/functions/syncfish.fish
```

**Step 11: Update fish config.fish**

Edit `stow/fish/.config/fish/config.fish`. The `PROJECT_HOME` and `XDG_CONFIG_HOME` env vars stay as-is since they're used by other tools, not just bootstrap. Remove `MACOS_CONFIG_HOME` since nothing else references it after bootstrap no longer needs it.

Change line 4 from:
```fish
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"
```
to remove it (delete the line).

**Step 12: Commit**

```bash
git add -A
git commit -m "restructure configs into stow packages"
```

---

### Task 3: Write setup/lib.sh

**Files:**
- Create: `setup/lib.sh`

**Step 1: Write lib.sh**

```bash
#!/usr/bin/env bash
# Shared library for bootstrap scripts -- source this, don't execute it.

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
    BOLD="\033[1m"
    DIM="\033[2m"
    RED="\033[31m"
    GREEN="\033[32m"
    YELLOW="\033[33m"
    BLUE="\033[34m"
    RESET="\033[0m"
else
    BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

# ── Logging ─────────────────────────────────────────────────────────
info()    { printf "      ${DIM}%s${RESET}\n" "$*"; }
success() { printf "      ${GREEN}+${RESET} %s\n" "$*"; }
warn()    { printf "      ${YELLOW}!${RESET} %s\n" "$*"; }
error()   { printf "      ${RED}x${RESET} %s\n" "$*" >&2; }

# ── Step header ─────────────────────────────────────────────────────
STEP_CURRENT=0
STEP_TOTAL=0

step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    printf "\n${BOLD}[%d/%d] %s${RESET}\n" "$STEP_CURRENT" "$STEP_TOTAL" "$1"
}

# ── Spinner ─────────────────────────────────────────────────────────
# Usage: spin "message" command arg1 arg2 ...
spin() {
    local msg="$1"; shift
    local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    local logfile
    logfile=$(mktemp)

    "$@" > "$logfile" 2>&1 &
    local pid=$!
    local i=0

    while kill -0 "$pid" 2>/dev/null; do
        printf "\r      ${BLUE}%s${RESET} %s" "${frames[$((i % ${#frames[@]}))]}" "$msg"
        i=$((i + 1))
        sleep 0.08
    done

    wait "$pid"
    local exit_code=$?

    printf "\r\033[K"  # clear spinner line

    if [[ $exit_code -eq 0 ]]; then
        success "$msg"
    else
        error "$msg"
        printf "${DIM}"
        cat "$logfile" >&2
        printf "${RESET}"
    fi

    rm -f "$logfile"
    return $exit_code
}

# ── Utilities ───────────────────────────────────────────────────────
is_installed() { command -v "$1" &>/dev/null; }

# Path to the dotfiles repo (parent of setup/)
DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

**Step 2: Commit**

```bash
git add setup/lib.sh
git commit -m "add setup/lib.sh shared library"
```

---

### Task 4: Write 01-brew.sh

**Files:**
- Create: `setup/01-brew.sh`

**Step 1: Write 01-brew.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Homebrew"

if ! is_installed brew; then
    spin "Installing Homebrew" /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add brew to PATH for the rest of this session
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    success "Homebrew installed"
fi

spin "Bundling packages" brew bundle --no-lock --file="$DOTFILES/Brewfile"
spin "Cleaning up" brew cleanup --prune=30
```

**Step 2: Commit**

```bash
git add setup/01-brew.sh
git commit -m "add setup/01-brew.sh"
```

---

### Task 5: Write 02-stow.sh

**Files:**
- Create: `setup/02-stow.sh`

**Step 1: Write 02-stow.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Symlinks"

stow_dir="$DOTFILES/stow"

for package in "$stow_dir"/*/; do
    name=$(basename "$package")

    if stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null; then
        success "$name"
    else
        # Retry with --adopt to handle existing files, then restow to fix
        if stow -d "$stow_dir" -t "$HOME" --adopt "$name" 2>/dev/null; then
            stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null
            warn "$name (adopted existing files)"
        else
            error "$name"
        fi
    fi
done
```

Note on `--adopt`: When stow encounters an existing regular file where it wants to place a symlink, `--adopt` moves the existing file into the stow package (overwriting the repo version) then creates the symlink. After that, `--restow` re-creates clean symlinks. This handles the migration case where configs were manually copied. After adopting, you can `git diff` to see what changed and decide what to keep.

**Step 2: Commit**

```bash
git add setup/02-stow.sh
git commit -m "add setup/02-stow.sh"
```

---

### Task 6: Write 03-shell.sh

**Files:**
- Create: `setup/03-shell.sh`

**Step 1: Write 03-shell.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Shell"

fish_path="$(brew --prefix)/bin/fish"

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

**Step 2: Commit**

```bash
git add setup/03-shell.sh
git commit -m "add setup/03-shell.sh"
```

---

### Task 7: Write 04-tools.sh

**Files:**
- Create: `setup/04-tools.sh`

**Step 1: Write 04-tools.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Tools"

if is_installed mise; then
    success "mise installed"
else
    warn "mise not found -- should have been installed by brew bundle"
fi

spin "Updating mise plugins" mise plugins update
spin "Installing mise tools" mise install
spin "Setting global Node.js" mise use --global node@latest

# Neovim providers
spin "Installing pynvim" pip3 install --upgrade pynvim
spin "Installing neovim gem" gem install neovim
```

**Step 2: Commit**

```bash
git add setup/04-tools.sh
git commit -m "add setup/04-tools.sh"
```

---

### Task 8: Write 05-mas.sh

**Files:**
- Create: `setup/05-mas.sh`

**Step 1: Write 05-mas.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Mac App Store"

if [[ "$(uname)" != "Darwin" ]]; then
    info "Skipping (not macOS)"
    return 0 2>/dev/null || exit 0
fi

declare -A apps=(
    ["1Password for Safari"]=1569813296
    ["Cyberduck"]=409222199
    ["Join for Teams"]=6747013429
    ["Microsoft Outlook"]=985367838
    ["Paprika Recipe Manager 3"]=1303222628
    ["Pixelmator Pro"]=1289583905
    ["Soulver 3"]=1508732804
    ["Table Tool"]=1122008420
    ["Xcode"]=497799835
)

for name in "${!apps[@]}"; do
    id="${apps[$name]}"
    if mas list | grep -q "^${id} "; then
        success "$name"
    else
        spin "Installing $name" mas install "$id"
    fi
done
```

**Step 2: Commit**

```bash
git add setup/05-mas.sh
git commit -m "add setup/05-mas.sh"
```

---

### Task 9: Write 06-macos.sh

**Files:**
- Create: `setup/06-macos.sh`

This is a near-copy of the existing `setup/macos.sh` but wrapped in the lib.sh framework. The `defaults write` commands stay the same since they're already idempotent.

**Step 1: Write 06-macos.sh**

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "macOS Defaults"

if [[ "$(uname)" != "Darwin" ]]; then
    info "Skipping (not macOS)"
    return 0 2>/dev/null || exit 0
fi

COMPUTER_NAME="${1:-ewa-mbp}"

info "Computer name: $COMPUTER_NAME"

# ── System ──────────────────────────────────────────────────────────
sudo scutil --set ComputerName "$COMPUTER_NAME"
sudo scutil --set HostName "$COMPUTER_NAME"
sudo scutil --set LocalHostName "$COMPUTER_NAME"
sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName -string "$COMPUTER_NAME"
sudo systemsetup -settimezone "America/Los_Angeles" > /dev/null
sudo systemsetup -setrestartfreeze on
defaults write com.apple.SoftwareUpdate ScheduleFrequency -int 1

# ── General UI/UX ──────────────────────────────────────────────────
defaults write NSGlobalDomain NSTableViewDefaultSizeMode -int 1
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false
defaults write com.apple.print.PrintingPrefs "Quit When Finished" -bool true
defaults write com.apple.LaunchServices LSQuarantine -bool false
sudo defaults write /Library/Preferences/com.apple.loginwindow AdminHostInfo HostName
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# ── SSD ─────────────────────────────────────────────────────────────
sudo pmset -a hibernatemode 0

# ── Screen ──────────────────────────────────────────────────────────
defaults write com.apple.screencapture disable-shadow -bool true
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0

# ── Keyboard ────────────────────────────────────────────────────────
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 15

# ── Finder ──────────────────────────────────────────────────────────
defaults write com.apple.finder NewWindowTarget -string "PfHm"
defaults write com.apple.finder NewWindowTargetPath -string "file://${HOME}/"
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool false
defaults write com.apple.finder ShowHardDrivesOnDesktop -bool false
defaults write com.apple.finder ShowMountedServersOnDesktop -bool false
defaults write com.apple.finder ShowRemovableMediaOnDesktop -bool false
defaults write NSGlobalDomain AppleShowAllExtensions -bool true
defaults write com.apple.finder ShowStatusBar -bool true
defaults write com.apple.finder ShowPathbar -bool true
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true
defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false
defaults write com.apple.finder FXEnableRemoveFromICloudDriveWarning -bool false
defaults write NSGlobalDomain com.apple.springing.enabled -bool true
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true
defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true

FINDER_PLIST=~/Library/Preferences/com.apple.finder.plist
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"

defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
defaults write com.apple.finder WarnOnEmptyTrash -bool false
chflags nohidden ~/Library
chflags nohidden /Users
sudo chflags nohidden /Volumes
defaults write com.apple.finder FXInfoPanesExpanded -dict \
    General -bool true \
    OpenWith -bool true \
    Privileges -bool true

# ── Dock & Hot Corners ──────────────────────────────────────────────
defaults write com.apple.dock tilesize -int 54
defaults write com.apple.dock magnification -bool false
defaults write com.apple.dock mineffect -string "scale"
defaults write com.apple.dock minimize-to-application -bool true
defaults write com.apple.dock expose-animation-duration -float 0.2
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock autohide-time-modifier -float 0.5
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock show-process-indicators -bool false
defaults write com.apple.dock persistent-apps -array
defaults write com.apple.dock showhidden -bool true

defaults write com.apple.dock wvous-tl-corner -int 2
defaults write com.apple.dock wvous-tl-modifier -int 0
defaults write com.apple.dock wvous-tr-corner -int 12
defaults write com.apple.dock wvous-tr-modifier -int 0
defaults write com.apple.dock wvous-bl-corner -int 3
defaults write com.apple.dock wvous-bl-modifier -int 0
defaults write com.apple.dock wvous-br-corner -int 4
defaults write com.apple.dock wvous-br-modifier -int 0

# ── Terminal ────────────────────────────────────────────────────────
defaults write com.apple.terminal StringEncodings -array 4

# ── TextEdit ────────────────────────────────────────────────────────
defaults write com.apple.TextEdit RichText -int 0
defaults write com.apple.TextEdit PlainTextEncoding -int 4
defaults write com.apple.TextEdit PlainTextEncodingForWrite -int 4

# ── Activity Monitor ───────────────────────────────────────────────
defaults write com.apple.ActivityMonitor OpenMainWindow -bool true
defaults write com.apple.ActivityMonitor ShowCategory -int 0
defaults write com.apple.ActivityMonitor SortColumn -string "CPUUsage"
defaults write com.apple.ActivityMonitor SortDirection -int 0
defaults write com.apple.ActivityMonitor UpdatePeriod -int 2
defaults write com.apple.ActivityMonitor DiskGraphType -int 1
defaults write com.apple.ActivityMonitor NetworkGraphType -int 1

# ── Photos ──────────────────────────────────────────────────────────
defaults -currentHost write com.apple.ImageCapture disableHotPlug -bool true

# ── Time Machine ───────────────────────────────────────────────────
defaults write com.apple.TimeMachine DoNotOfferNewDisksForBackup -bool true

# ── Messages ───────────────────────────────────────────────────────
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "automaticQuoteSubstitutionEnabled" -bool false
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "continuousSpellCheckingEnabled" -bool false

# ── Restart affected apps ──────────────────────────────────────────
for app in "Dock" "Finder"; do
    killall "${app}" > /dev/null 2>&1 || true
done
sudo killall cfprefsd > /dev/null 2>&1 || true

success "macOS defaults applied"
info "Some changes require logout/restart"
```

**Step 2: Commit**

```bash
git add setup/06-macos.sh
git commit -m "add setup/06-macos.sh"
```

---

### Task 10: Write new bootstrap.sh

**Files:**
- Modify: `bootstrap.sh`

**Step 1: Rewrite bootstrap.sh**

```bash
#!/usr/bin/env bash
#
# Bootstrap a fresh macOS machine or update an existing one.
# Safe to re-run anytime -- every step is idempotent.
#

set -euo pipefail

DOTFILES="$(cd "$(dirname "$0")" && pwd)"
source "$DOTFILES/setup/lib.sh"

STEP_TOTAL=6
START_TIME=$SECONDS

printf "\n${BOLD}dotfiles bootstrap${RESET}\n"
printf "==================\n"

# Run each step script
source "$DOTFILES/setup/01-brew.sh"
source "$DOTFILES/setup/02-stow.sh"
source "$DOTFILES/setup/03-shell.sh"
source "$DOTFILES/setup/04-tools.sh"
source "$DOTFILES/setup/05-mas.sh"
source "$DOTFILES/setup/06-macos.sh"

elapsed=$(( SECONDS - START_TIME ))
minutes=$(( elapsed / 60 ))
seconds=$(( elapsed % 60 ))

printf "\n${GREEN}${BOLD}Done${RESET} in %dm %ds\n\n" "$minutes" "$seconds"
```

Note: We use `source` here intentionally (not subprocess execution) so that the step scripts share the `lib.sh` functions and `STEP_CURRENT`/`STEP_TOTAL` counters. Each step script calls `step()` which increments the counter. The `set -euo pipefail` in lib.sh provides error handling. This is a deliberate design choice -- the isolation benefit of subprocesses doesn't outweigh the simplicity of shared state for a 6-step bootstrap.

**Step 2: Commit**

```bash
git add bootstrap.sh
git commit -m "rewrite bootstrap.sh with clean output and step runner"
```

---

### Task 11: Clean up old setup scripts

**Files:**
- Delete: `setup/brew.sh`
- Delete: `setup/mas.sh`
- Delete: `setup/shell.sh`
- Delete: `setup/tools.sh`
- Delete: `setup/macos.sh`

**Step 1: Remove old scripts**

```bash
git rm setup/brew.sh setup/mas.sh setup/shell.sh setup/tools.sh setup/macos.sh
```

**Step 2: Commit**

```bash
git commit -m "remove old setup scripts"
```

---

### Task 12: Make scripts executable and verify

**Step 1: Set executable bits**

```bash
chmod +x bootstrap.sh setup/01-brew.sh setup/02-stow.sh setup/03-shell.sh setup/04-tools.sh setup/05-mas.sh setup/06-macos.sh
```

**Step 2: Syntax check all scripts**

```bash
bash -n bootstrap.sh
bash -n setup/lib.sh
bash -n setup/01-brew.sh
bash -n setup/02-stow.sh
bash -n setup/03-shell.sh
bash -n setup/04-tools.sh
bash -n setup/05-mas.sh
bash -n setup/06-macos.sh
```

Expected: No output (clean parse).

**Step 3: Verify stow packages have correct structure**

```bash
# Each package dir under stow/ should contain paths relative to $HOME
ls -la stow/
ls -la stow/fish/.config/fish/
ls -la stow/git/
ls -la stow/hammerspoon/.hammerspoon/
```

**Step 4: Commit if any changes**

```bash
git add -A
git commit -m "make setup scripts executable" 2>/dev/null || true
```

---

### Task 13: Handle migration of existing symlinks

Before stow can manage symlinks, existing manual symlinks need to be removed. This step is a one-time migration.

**Step 1: Remove existing manual symlinks**

On the live system, remove the manually-created symlinks so stow can recreate them:

```bash
# Remove existing fish symlinks (created by syncfish)
rm -f ~/.config/fish/config.fish
rm -f ~/.config/fish/fish_plugins
rm -f ~/.config/fish/functions/clearcache.fish
rm -f ~/.config/fish/functions/rm.fish
rm -f ~/.config/fish/functions/syncfish.fish
rm -f ~/.config/fish/functions/upall.fish
rm -f ~/.config/fish/conf.d/abbreviations.fish
rm -f ~/.config/fish/conf.d/greeting.fish
# Remove stale symlinks
rm -f ~/.config/fish/functions/clearbrowsercache.fish
rm -f ~/.config/fish/functions/test.fish

# Remove existing directory symlinks
rm -f ~/.hammerspoon
rm -f ~/.config/karabiner
```

**Step 2: Run stow to verify it works**

```bash
cd ~/Projects/dotfiles
stow -d stow -t ~ --restow fish git hammerspoon karabiner newsboat pianobar readline
```

Expected: No errors. Verify with:

```bash
ls -la ~/.config/fish/config.fish    # -> stow/fish/.config/fish/config.fish
ls -la ~/.gitconfig                   # -> stow/git/.gitconfig
ls -la ~/.hammerspoon                 # -> stow/hammerspoon/.hammerspoon (or contents within)
ls -la ~/.config/karabiner            # -> stow/karabiner/.config/karabiner (or contents within)
```

This step does NOT need a commit -- it's a live system operation.
