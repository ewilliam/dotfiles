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
