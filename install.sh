#!/bin/sh

set -e


if [ -z ${PROJECT_HOME} ]; then
    echo "Please set \$PROJECT_HOME"
else
    # Ask for the administrator password upfront
    sudo -v

    # Keep-alive: update existing `sudo` time stamp until setup has finished
    while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

    if [ ! -d "$PROJECT_HOME/dotfiles" ]; then
        echo "Installing dotfiles for the first time..."
        git clone https://github.com/ewilliam/dot.git "$PROJECT_HOME/dotfiles"
        cd "$PROJECT_HOME/dotfiles"
        rake install
    else
        echo "Dotfiles is already installed"
    fi

    source install/brew.sh
    source install/mas.sh
    source install/shell.sh
    source install/tools.sh
    # source install/mail.sh
fi
