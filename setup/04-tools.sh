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
