#!/bin/sh

install_message () {
    echo Attempting to install $1...
}

echo 'Starting setup/tools.sh...'

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

install_message "asdf plugins"
bash << END
asdf plugin-add ruby
asdf plugin-add elixir
asdf plugin-add erlang
asdf plugin-add node
exit 0 # prevent script from stopping
END

install_message "Ruby"
asdf install ruby 2.6.0

install_message "favorite Ruby gems"
gem install bundler
gem install byebug
gem install pry
gem install pry-byebug
gem install pry-remote
gem install awesome_print
gem install rails
gem install lunchy

install_message "Elixir"
asdf install elixir 1.7.4

install_message "Erlang"
asdf install erlang 21.1.1

install_message "Node"
asdf install nodejs 10.13.0
# ~/.asdf/plugins/nodejs/bin/import-release-team-keyring

install_message "Neovim Python and Ruby"
pip2 install neovim
pip3 install neovim
gem install neovim

install_message "virtualenv and virtualfish"
pip install virtualenv
pip install virtualfish

install_message "Goobook"
pip3 install goobook

echo Tools good to go!
