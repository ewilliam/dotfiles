#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "ClamAV"

CLAMAV_ETC="/opt/homebrew/etc/clamav"
CLAMAV_CONF="$DOTFILES/config/clamav"

if ! is_installed freshclam; then
    warn "clamav not found -- should have been installed by brew bundle"
    return 0
fi

# Ensure directories exist
mkdir -p /opt/homebrew/var/lib/clamav
mkdir -p /opt/homebrew/var/log

# Symlink configs from dotfiles into Homebrew's ClamAV directory
for conf in freshclam.conf clamd.conf; do
    target="$CLAMAV_ETC/$conf"
    source="$CLAMAV_CONF/$conf"

    if [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then
        success "$conf"
    else
        [ -f "$target" ] && [ ! -L "$target" ] && mv "$target" "${target}.bak"
        ln -sf "$source" "$target"
        success "$conf symlinked"
    fi
done

# Download virus databases if not already present
if [ ! -f /opt/homebrew/var/lib/clamav/main.cvd ]; then
    spin "Downloading virus databases" freshclam
else
    success "virus databases present"
fi
