#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Homebrew"

if ! is_installed brew; then
    info "Installing Homebrew (may prompt for sudo)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add brew to PATH for the rest of this session
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi

    success "Homebrew installed"
else
    success "Homebrew installed"
fi

spin "Bundling packages" brew bundle --file="$DOTFILES/Brewfile"
spin "Cleaning up" brew cleanup --prune=30
