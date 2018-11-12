#!/bin/sh

if test ! "$( which fish )"; then
    brew install fish

    fish_path=/usr/local/bin/fish

    if ! grep -Fxq $fish_path /etc/shells; then
        echo "Adding fish shell to /etc/shells..."
        echo $fish_path | sudo tee -a /etc/shells > /dev/null
    fi

    echo "Installing fisher package manager..."
    curl https://git.io/fisher --create-dirs -sLo ~/.config/fish/functions/fisher.fish

    echo "Picking fish as default shell..."
    chsh -s /usr/local/bin/fish
    fisher_plugin_status=Installing

else
    echo "Fish already installed."
    fisher_plugin_status=Updating
fi

fish << END_FISH
    echo $fisher_plugin_status fisher plugins...
    fisher
END_FISH
