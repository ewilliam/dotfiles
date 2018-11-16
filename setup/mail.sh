echo "Linking offlineimaprc to home directory..."
ln -sfv $PROJECT_HOME/dotfiles/neomutt/offlineimaprc ~/.offlineimaprc

echo "Linking notmuch-config to home directory..."
ln -sfv $PROJECT_HOME/dotfiles/neomutt/notmuch-config ~/.notmuch-config

echo "Linking mutt-notmuch-py to /usr/local/bin..."
ln -sfv $PROJECT_HOME/dotfiles/neomutt/mutt-notmuch-py /usr/local/bin

echo "Linking msmtprc to home directory..."
ln -sfv $PROJECT_HOME/dotfiles/neomutt/msmtprc ~/.msmtprc
