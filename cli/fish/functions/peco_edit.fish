# edit file with fuzzy search
function peco_edit
  fish -c "exec $EDITOR (fzf)";
end
