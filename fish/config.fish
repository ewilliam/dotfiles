set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

fish_vi_key_bindings

fish_add_path /opt/homebrew/sbin

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

# remap z directory jumper to j
set -U Z_CMD j

# pnpm
set -gx PNPM_HOME /Users/ewilliam/Library/pnpm
if not string match -q -- $PNPM_HOME $PATH
    set -gx PATH "$PNPM_HOME" $PATH
end

# jj
jj util completion fish | source

# claude
alias claude="/Users/ewilliam/.claude/local/claude"
