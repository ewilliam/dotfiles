set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects

fish_vi_key_bindings

fish_add_path /opt/homebrew/sbin

# zoxide directory jumper (aliased to j)
zoxide init --cmd j fish | source

# pnpm
set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path $PNPM_HOME

# jj
jj util completion fish | source

# claude
fish_add_path $HOME/.local/bin

# orbstack
source ~/.orbstack/shell/init2.fish 2>/dev/null || :
