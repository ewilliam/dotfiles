#!/bin/sh

set -e

if [ ! -d "$HOME/.dotfiles" ]; then
    echo "Installing dotfiles for the first time..."
    cp -r "$HOME/dotfiles" "$HOME/.dotfiles"
    cd "$HOME/.dotfiles"
    [ "$1" = "ask" ] && export ASK="true"
    rake install
else
    echo "Dotfiles is already installed"
fi
