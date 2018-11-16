#!/bin/sh

set -e

echo "Starting setup script..."

if [ -z ${PROJECT_HOME} ]; then
    echo "Please set \$PROJECT_HOME"
    exit 1
else

    if [[ "$(uname)" == "Darwin" ]] && [[ -z ${MACOS_CONFIG_HOME} ]]; then
        echo "Please set \$MACOS_CONFIG_HOME"
        exit 1
    fi

    # Ask for password
    # sudo -v

    # Keep-alive: update existing `sudo` time stamp until setup has finished
    # while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

    if [ ! -d "$PROJECT_HOME/dotfiles" ]; then
        echo "Installing dotfiles for the first time..."
        git clone https://github.com/ewilliam/dot.git "$PROJECT_HOME/dotfiles"
        cd "$PROJECT_HOME/dotfiles"
    else
        echo "Dotfiles already installed."
    fi

    rake setup
    source setup/brew.sh
    source setup/mas.sh
    source setup/shell.sh
    source setup/functions.sh
    source setup/tools.sh
    # source setup/macos.sh
    source setup/mail.sh
fi

echo "Bootstrap done!"
