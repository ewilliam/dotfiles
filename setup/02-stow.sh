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
