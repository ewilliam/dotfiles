function peco_mosh
  if [ (count $argv) ]
    set peco_flags --query "$argv"
  else
    set peco_flags
  end

  __ssh_known_hosts | peco $peco_flags | read foo

  if [ $foo ]
    eval mosh "$foo"
  else
    commandline ''
  end
end

function __ssh_known_hosts
  cat ~/.ssh/known_hosts{,2} ^/dev/null | cut -d ' ' -f 1 | cut -d , -f 1 | grep -v '^|1|' | sed -e 's/\[\(.*\)\]:\([0-9]*\)/\1 -p \2/g' | sort -u
end
