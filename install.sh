#!/bin/sh

set -e

if [ -z ${PROJECT_HOME} ]; then
    echo "Please set \$PROJECT_HOME"
else
    if [ ! -d "$PROJECT_HOME/dotfiles" ]; then
        echo "Installing dotfiles for the first time..."
        git clone https://github.com/ewilliam/dot.git "$PROJECT_HOME/dotfiles"
        cd "$PROJECT_HOME/dotfiles"
        [ "$1" = "ask" ] && export ASK="true"
        rake install
    else
        echo "Dotfiles is already installed"
    fi
fi
