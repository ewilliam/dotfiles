#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Tools"

if is_installed mise; then
    success "mise installed"
else
    warn "mise not found -- should have been installed by brew bundle"
fi

spin "Updating mise plugins" mise plugins update
spin "Installing mise tools" mise install
spin "Setting global Node.js" mise use --global node@latest
spin "Setting global pnpm" mise use --global pnpm@latest
spin "Setting global Python" mise use --global python@latest
spin "Setting global uv" mise use --global uv@latest
spin "Setting global Erlang" mise use --global erlang@latest
spin "Setting global Elixir" mise use --global elixir@latest
