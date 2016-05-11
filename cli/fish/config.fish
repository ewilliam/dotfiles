set fisher_home ~/.local/share/fisherman
set fisher_config ~/.config/fisherman

set -x EDITOR nvim

# Python version/envirnoment management
# https://github.com/adambrenecki/virtualfish
# set -x PIP_REQUIRE_VIRTUALENV true
set -x WORKON_HOME ~/.virtualenvs
eval (python -m virtualfish compat_aliases auto_activation global_requirements)

# Ruby version management
# https://github.com/JeanMertz/chruby-fish
source /usr/local/share/chruby/chruby.fish
source /usr/local/share/chruby/auto.fish
chruby 2.3.1

# https://github.com/nvbn/thefuck/wiki/shell-aliases
eval (thefuck --alias | tr '\n' ';')

# teamocil autocompletion
complete -c teamocil -a "(teamocil --list)"

fish_vi_mode

source $fisher_home/config.fish
source ~/.secrets.fish
