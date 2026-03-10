#!/bin/sh

echo 'Starting setup/mas.sh...'

apps=(
    "1Password for Safari:1569813296"
    "Cyberduck:409222199"
    "Join for Teams:6747013429"
    "Microsoft Outlook:985367838"
    "Paprika Recipe Manager 3:1303222628"
    "Pixelmator Pro:1289583905"
    "Soulver 3:1508732804"
    "Table Tool:1122008420"
    "Xcode:497799835"
    )

for app in "${apps[@]}"; do
    name=${app%%:*}
    id=${app#*:}

    echo "Attempting to install $name"
    mas install "$id"
done
