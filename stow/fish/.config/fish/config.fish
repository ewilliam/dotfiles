set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects

fish_vi_key_bindings

fish_add_path /opt/homebrew/sbin

# mise runtime manager
mise activate fish | source

# direnv
direnv hook fish | source

# zoxide directory jumper (aliased to j)
zoxide init --cmd j fish | source

# pnpm
set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path $PNPM_HOME

# jj
command -q jj && jj util completion fish | source

# claude
fish_add_path $HOME/.local/bin

# orbstack
source ~/.orbstack/shell/init2.fish 2>/dev/null || :

# secrets (API keys, tokens, etc.)
source ~/.secrets.fish 2>/dev/null || :
