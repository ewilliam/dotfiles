set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

fish_vi_key_bindings

fish_add_path /opt/homebrew/sbin

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

# remap z directory jumper to j
set -g Z_CMD j

# pnpm
set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path $PNPM_HOME

# jj
jj util completion fish | source

# claude
fish_add_path $HOME/.local/bin

# Added by OrbStack: command-line tools and integration
# This won't be added again if you remove it.
source ~/.orbstack/shell/init2.fish 2>/dev/null || :
