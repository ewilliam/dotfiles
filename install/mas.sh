#!/bin/sh

apps=(
    "Eon Timer:413744108"
    "Pixelmator:407963104"
    "Todoist:585829637"
    )

for app in "${apps[@]}"; do
    name=${app%%:*}
    id=${app#*:}

    echo "Attempting to install $name"
    mas install "$id"
done
