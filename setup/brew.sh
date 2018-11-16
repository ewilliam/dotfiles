#!/bin/sh

echo 'Starting setup/brew.sh...'

if test ! "$( which brew )"; then
    echo "Installing Homebrew..."
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    cd "$PROJECT_HOME/dotfiles"

    echo "Installing Homebrew packages..."
    brew bundle
else
    echo "Homebrew already installed. Updating and cleaning up..."
    brew update; brew upgrade; brew cleanup; brew prune
    bash <<-HEAD
        brew doctor
        exit 0 # prevent script from stopping
HEAD
fi
