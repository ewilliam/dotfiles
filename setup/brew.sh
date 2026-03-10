#!/bin/sh

echo 'Starting setup/brew.sh...'

if test ! "$( which brew )"; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    cd "$PROJECT_HOME/dotfiles"

    echo "Installing Homebrew packages..."
    brew bundle
else
    echo "Homebrew already installed. Updating and cleaning up..."
    brew update; brew upgrade; brew cleanup
    bash <<-HEAD
        brew doctor
        exit 0 # prevent script from stopping
HEAD
fi
