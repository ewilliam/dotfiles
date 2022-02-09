set -x EDITOR nvim
set -x XDG_CONFIG_HOME $HOME/.config
set -x PROJECT_HOME $HOME/Projects
set -x MACOS_CONFIG_HOME "$HOME/Library/Application Support"

set --export ANDROID $HOME/Library/Android;
set --export ANDROID_HOME $ANDROID/sdk;
set -gx PATH $ANDROID_HOME/tools $PATH;
set -gx PATH $ANDROID_HOME/tools/bin $PATH;
set -gx PATH $ANDROID_HOME/platform-tools $PATH;
set -gx PATH $ANDROID_HOME/emulator $PATH

set --export JAVA_HOME /Applications/Android\ Studio.app/Contents/jre/jdk/Contents/Home;
set -gx PATH $JAVA_HOME/bin $PATH;

test -e {$HOME}/.iterm2_shell_integration.fish ; and source {$HOME}/.iterm2_shell_integration.fish

fish_vi_key_bindings

# point to hotel proxy in terminal
# alternatively use https://github.com/oh-my-fish/plugin-proxy
# set -x http_proxy http://localhost:2000/proxy.pac

# use grc for specific commands
set -U grc_plugin_execs cat df diff dig ifconfig netstat ping tail traceroute
set -U grcplugin_ls -alGh

# https://github.com/nvbn/thefuck/wiki/shell-aliases
thefuck --alias | source

# remap z directory jumper to j
set -U Z_CMD "j"

# source ~/.secrets.fish

if test -f "/Users/ewilliam/.shopify-app-cli/shopify.fish"
  source "/Users/ewilliam/.shopify-app-cli/shopify.fish"
end

source /opt/homebrew/opt/asdf/libexec/asdf.fish
fish_add_path /opt/homebrew/sbin

set -gx PNPM_HOME "/Users/ewilliam/Library/pnpm"
set -gx PATH "$PNPM_HOME" $PATH
