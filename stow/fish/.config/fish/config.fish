set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects

fish_vi_key_bindings

# macOS-only: Homebrew sbin (Apple Silicon path)
if test (uname) = Darwin
    fish_add_path /opt/homebrew/sbin
end

# mise runtime manager
command -q mise && mise activate fish | source

# direnv
command -q direnv && direnv hook fish | source

# zoxide directory jumper (aliased to j)
command -q zoxide && zoxide init --cmd j fish | source

# pnpm
if test (uname) = Darwin
    set -gx PNPM_HOME $HOME/Library/pnpm
else
    set -gx PNPM_HOME $HOME/.local/share/pnpm
end
fish_add_path $PNPM_HOME

# jj
command -q jj && jj util completion fish | source

# claude
fish_add_path $HOME/.local/bin

# orbstack
source ~/.orbstack/shell/init2.fish 2>/dev/null || :

# secrets (API keys, tokens, etc.)
source ~/.secrets.fish 2>/dev/null || :
