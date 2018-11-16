#!/bin/sh

echo 'Starting setup/shell.sh...'

if test ! "$( which fish )"; then
    brew install fish
else
    echo "Fish already installed."
fi

fish_path=/usr/local/bin/fish

if ! grep -Fxq $fish_path /etc/shells; then
    echo "Adding fish shell to /etc/shells..."

    echo $fish_path | sudo tee -a /etc/shells > /dev/null

    echo "Picking fish as default shell..."

    chsh -s $(brew --prefix)/bin/fish
fi

if [ ! -f ~/.secrets.fish ]; then
    echo Adding ~/.secrets.fish
    touch ${HOME}/.secrets.fish
fi

fish << END_FISH
    if not functions -q fisher
        echo Installing fisher package manager...
        curl https://git.io/fisher --create-dirs -sLo $XDG_CONFIG_HOME/fish/functions/fisher.fish
        set fisher_plugin_status Installing
    else
        echo Fisher already installed.
        set fisher_plugin_status Updating
    end

    echo $fisher_plugin_status fisher plugins...
    fish -c fisher
END_FISH
