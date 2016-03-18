set fisher_home ~/.local/share/fisherman
set fisher_config ~/.config/fisherman
set -x EDITOR nvim

fish_vi_mode

# https://github.com/JeanMertz/chruby-fish
source /usr/local/share/chruby/chruby.fish
source /usr/local/share/chruby/auto.fish
chruby 2.3

# https://github.com/nvbn/thefuck/wiki/shell-aliases
eval (thefuck --alias | tr '\n' ';')

# teamocil autocompletion
complete -c teamocil -a "(teamocil --list)"

source $fisher_home/config.fish
