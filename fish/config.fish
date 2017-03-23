set -x EDITOR nvim

fish_vi_key_bindings

# nerdfonts for bobthefish fish prompt
set -g theme_nerd_fonts yes

# point to hotel proxy in terminal
# convert to function. global unneccessary
# set -x http_proxy http://localhost:2000/proxy.pac

# manage ruby versions
# https://github.com/JeanMertz/chruby-fish
source /usr/local/share/chruby/chruby.fish
source /usr/local/share/chruby/auto.fish

# manage python versions/environments
# https://github.com/adambrenecki/virtualfish
# set -x PIP_REQUIRE_VIRTUALENV true
set -x WORKON_HOME ~/.virtualenvs
eval (python -m virtualfish compat_aliases auto_activation global_requirements)

# teamocil autocompletion
complete -c teamocil -a "(teamocil --list)"

# use grc for specific commands
set -U grc_wrap_commands cat df diff dig ifconfig netstat ping tail traceroute

# https://github.com/nvbn/thefuck/wiki/shell-aliases
eval (thefuck --alias | tr '\n' ';')

# for openni2
set -x  OPENNI2_INCLUDE /usr/local/include/ni2
set -x  OPENNI2_REDIST /usr/local/lib/ni

# for Shopify Theme Kit
# set -U fish_user_paths /Users/ewilliam/.themekit $fish_user_paths

# for rubymotion android
set -x RUBYMOTION_ANDROID_SDK ~/.rubymotion-android/sdk
set -x RUBYMOTION_ANDROID_NDK ~/.rubymotion-android/ndk

# source ~/.asdf/asdf.fish
source ~/.secrets.fish
