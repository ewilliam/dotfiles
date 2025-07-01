set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

fish_vi_key_bindings

# use grc for specific commands
set -U grc_plugin_execs cat df diff dig ifconfig netstat ping tail traceroute
set -U grcplugin_ls -alGh

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

# remap z directory jumper to j
set -U Z_CMD j

fish_add_path /opt/homebrew/sbin

# pnpm
set -gx PNPM_HOME /Users/ewilliam/Library/pnpm
if not string match -q -- $PNPM_HOME $PATH
    set -gx PATH "$PNPM_HOME" $PATH
end
# pnpm end

# jj
jj util completion fish | source

# claude
alias claude="/Users/ewilliam/.claude/local/claude"
