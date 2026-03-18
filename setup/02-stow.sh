#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Symlinks"

stow_dir="$DOTFILES/stow"

for package in "$stow_dir"/*/; do
    name=$(basename "$package")

    if stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null; then
        success "$name"
    else
        # Conflict: a real (non-symlink) file exists at one or more target paths.
        # Strategy:
        #   1. --adopt moves conflicting files into the repo (stow can then proceed)
        #   2. For each adopted file, if it differs from the committed version,
        #      save it as .bak and restore the repo version via git checkout
        #   3. --restow places the symlinks
        # Net result: repo version always wins; user's file preserved as .bak if different.
        if stow -d "$stow_dir" -t "$HOME" --adopt "$name" 2>/dev/null; then
            # Restore any repo files that --adopt overwrote with the user's version
            adopted_files=$(git -C "$stow_dir" diff --name-only HEAD 2>/dev/null || true)
            if [[ -n "$adopted_files" ]]; then
                while IFS= read -r rel; do
                    abs="$stow_dir/$rel"
                    target_rel="${rel#$name/}"
                    target="$HOME/$target_rel"
                    # Save the adopted (user's) version as .bak, restore repo version
                    cp "$abs" "${abs}.bak.tmp"
                    git -C "$stow_dir" checkout HEAD -- "$rel" 2>/dev/null
                    mv "${abs}.bak.tmp" "${target}.bak"
                    warn "backed up existing ~/$target_rel → ~/${target_rel}.bak"
                done <<< "$adopted_files"
            fi

            stow -d "$stow_dir" -t "$HOME" --restow "$name" 2>/dev/null
            warn "$name (conflicts resolved)"
        else
            error "$name"
        fi
    fi
done
