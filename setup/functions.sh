#!/bin/sh

echo "Linking files in fish/chum to home directory..."
ln -sfv ${PROJECT_HOME}/dotfiles/fish/chum/* ${XDG_CONFIG_HOME}/fish/functions/

fish << END_FISH
    if functions -q import_aliases
        echo Importing bash aliases into fish functions...
        import_aliases ${PROJECT_HOME}/dotfiles/fish/aliases
        import_aliases ${PROJECT_HOME}/dotfiles/fish/aliases_mac
    end

    echo Custom fish functions added.
END_FISH
