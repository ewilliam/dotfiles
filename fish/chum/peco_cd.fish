# query fasd for recent directories to cd into
function peco_cd
  begin
    sort -r -t '|' -k 3 ~/.fasd | sed -e 's/\|.*//'
  end | sed -e 's/\/$//' | awk '!a[$0]++' | __peco_cd $argv
end

function __peco_cd
  if [ (count $argv) ]
    set peco_flags --query "$argv"
  else
    set peco_flags
  end

  peco $peco_flags | read foo

  if [ $foo ]
    builtin cd $foo
  else
    commandline ''
  end
end
