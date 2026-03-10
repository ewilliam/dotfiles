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
