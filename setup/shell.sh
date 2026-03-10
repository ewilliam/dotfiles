#!/bin/sh

echo 'Starting setup/shell.sh...'

if test ! "$( which fish )"; then
    brew install fish
else
    echo "Fish already installed."
fi

fish_path=$(brew --prefix)/bin/fish

if ! grep -Fxq "$fish_path" /etc/shells; then
    echo "Adding fish shell to /etc/shells..."

    echo "$fish_path" | sudo tee -a /etc/shells > /dev/null

    echo "Picking fish as default shell..."

    chsh -s "$fish_path"
fi

if [ ! -f ~/.secrets.fish ]; then
    echo Adding ~/.secrets.fish
    touch "${HOME}/.secrets.fish"
fi

fish << 'END_FISH'
    if not functions -q fisher
        echo Installing fisher plugin manager...
        curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher
        set fisher_plugin_status Installing
    else
        echo Fisher already installed.
        set fisher_plugin_status Updating
    end

    echo "$fisher_plugin_status fisher plugins..."
    fisher update
END_FISH
