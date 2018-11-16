#!/bin/sh

install_message () {
    echo Attempting to install $1...
}

echo 'Starting install/tools.sh...'

if [ ! -d "$HOME/.asdf" ]; then
    install_message "asdf version manager"
    git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.6.0
    # echo 'source ~/.asdf/asdf.fish' >> ~/.config/fish/config.fish
    mkdir -p ~/.config/fish/completions
    cp ~/.asdf/completions/asdf.fish ~/.config/fish/completions
else
    asdf plugin-update --all
    asdf update
fi

install_message "Ruby"
asdf plugin-add ruby
asdf install ruby 2.5.3

install_message "favorite gems"
gem install bundler
gem install pry
gem install pry-remote
gem install rails
gem install lunchy

install_message "Elixir"
asdf plugin-add elixir
asdf install elixir 1.7.4

install_message "Erlang"
asdf plugin-add erlang
asdf install erlang 21.1.1

install_message "Node"
asdf plugin-add nodejs
asdf install nodejs 10.13.0

install_message "Neovim Python and Ruby"
pip2 install neovim
pip3 install neovim
gem install neovim

install_message "virtualenv"
pip install virtualenv
