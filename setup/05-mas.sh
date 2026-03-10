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
