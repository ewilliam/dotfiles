install_attempt="Attempting to install"

if [ ! -d "$HOME/.asdf" ]; then
    echo "$install_attempt asdf version manager..."
    git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.6.0
    # echo 'source ~/.asdf/asdf.fish' >> ~/.config/fish/config.fish
    mkdir -p ~/.config/fish/completions
    cp ~/.asdf/completions/asdf.fish ~/.config/fish/completions
else
    asdf plugin-update --all
    asdf update
fi

echo "$install_attempt Ruby..."
asdf plugin-add ruby
asdf install ruby 2.5.3

echo "$install_attempt favorite gems..."
gem install bundler
gem install pry
gem install pry-remote
gem install rails
gem install lunchy

echo "$install_attempt Elixir..."
asdf plugin-add elixir
asdf install elixir 1.7.4

echo "$install_attempt Erlang..."
asdf plugin-add erlang
asdf install erlang 21.1.1

echo "$install_attempt Neovim Python and Ruby..."
pip2 install neovim
pip3 install neovim
gem install neovim

echo "$install_attempt virtualenv..."
pip install virtualenv
