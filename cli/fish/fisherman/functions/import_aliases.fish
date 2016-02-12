# fish functions much faster than alias eval
function import_aliases --description 'bash aliases to .fish function files.'
  if test -n "$argv"
    for a in (cat $argv | grep "^alias")
      set aname (echo $a | grep -Eoe "[a-z0-9]+=" | sed 's/=//')
      set command (echo $a | sed 's/^alias .*=//' \
        | sed 's/^ *\'//' | sed 's/\' *$//' )
      echo "Processing alias $aname as $command"
      if test -f ~/.config/fish/functions/$aname.fish
        echo Function $aname is already defined. Skipping...
      else
        alias $aname $command
        funcsave $aname
      end
    end
  else
    echo (tint: red (bold: 'Pick a file.'))
  end
end
