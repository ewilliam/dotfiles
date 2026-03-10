#!/bin/sh

echo 'Starting setup/tools.sh...'

if test ! "$( which mise )"; then
    echo "Installing mise..."
    brew install mise
else
    echo "mise already installed."
fi

echo "Updating mise plugins and tools..."
mise plugins update
mise upgrade

echo "Installing mise tools from config..."
mise install

echo "Setting up Neovim providers..."
pip3 install --upgrade pynvim 2>/dev/null || true
gem install neovim 2>/dev/null || true

echo "Tools good to go!"
