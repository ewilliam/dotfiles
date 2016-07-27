set -x EDITOR nvim

fish_vi_key_bindings

# Ruby version management
# https://github.com/JeanMertz/chruby-fish
source /usr/local/share/chruby/chruby.fish
source /usr/local/share/chruby/auto.fish
chruby 2.3.1

# Python version/envirnoment management
# https://github.com/adambrenecki/virtualfish
# set -x PIP_REQUIRE_VIRTUALENV true
set -x WORKON_HOME ~/.virtualenvs
eval (python -m virtualfish compat_aliases auto_activation global_requirements)

# teamocil autocompletion
complete -c teamocil -a "(teamocil --list)"

# use grc for specific commands
set -U grc_wrap_commands cat df diff dig ifconfig netstat ping tail traceroute

# initialize fasd
# https://jurriaan.ninja/2014/12/21/fish-shell-and-fasd.html
function -e fish_preexec _run_fasd
  fasd --proc (fasd --sanitize "$argv") > "/dev/null" 2>&1
end

# https://github.com/nvbn/thefuck/wiki/shell-aliases
eval (thefuck --alias | tr '\n' ';')

# for openni2
set -x  OPENNI2_INCLUDE /usr/local/include/ni2
set -x  OPENNI2_REDIST /usr/local/lib/ni

source ~/.secrets.fish
