set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

fish_vi_key_bindings

# nerdfonts for bobthefish fish prompt
set -g theme_nerd_fonts yes

# don't show ruby version in fish prompt
set -g theme_display_ruby no

# point to hotel proxy in terminal
# TODO: convert to function
# set -x http_proxy http://localhost:2000/proxy.pac

# manage python versions/environments
# https://github.com/adambrenecki/virtualfish
# set -x PIP_REQUIRE_VIRTUALENV true
set -x WORKON_HOME ~/.virtualenvs
eval (python -m virtualfish compat_aliases auto_activation global_requirements)

# use grc for specific commands
set -U grc_wrap_commands cat df diff dig ifconfig netstat ping tail traceroute

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

source ~/.asdf/asdf.fish
source ~/.secrets.fish
