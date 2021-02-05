set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

fish_vi_key_bindings

# nerdfonts for fish prompt
set -g theme_nerd_fonts yes

# prompt theme
set theme_color_scheme gruvbox

# don't show ruby version in prompt
set -g theme_display_ruby no

# point to hotel proxy in terminal
# alternatively use https://github.com/oh-my-fish/plugin-proxy
# set -x http_proxy http://localhost:2000/proxy.pac

# use grc for specific commands
set -U grc_plugin_execs cat df diff dig ifconfig netstat ping tail traceroute
set -U grcplugin_ls -alGh

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

source ~/.asdf/asdf.fish
source ~/.secrets.fish

if test -f "/Users/ewilliam/.shopify-app-cli/shopify.fish"
  source "/Users/ewilliam/.shopify-app-cli/shopify.fish"
end

set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
