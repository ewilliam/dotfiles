#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Mac App Store"

if [[ "$(uname)" != "Darwin" ]]; then
    info "Skipping (not macOS)"
    return 0 2>/dev/null || exit 0
fi

mas_install() {
    local name="$1" id="$2"
    if mas list | grep -q "^${id} "; then
        success "$name"
    else
        spin "Installing $name" mas install "$id"
    fi
}

mas_install "1Password for Safari"     1569813296
mas_install "Join for Teams"           6747013429
mas_install "Paprika Recipe Manager 3" 1303222628
mas_install "Pixelmator Pro"           1289583905
mas_install "Xcode"                    497799835
