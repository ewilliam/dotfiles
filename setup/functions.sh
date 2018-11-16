#!/bin/sh

echo "Linking files in fish/chum to home directory..."
ln -sfv ${PROJECT_HOME}/dotfiles/fish/chum/* ${XDG_CONFIG_HOME}/fish/functions/
