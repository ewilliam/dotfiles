  let g:unite_source_menu_menus.help = {
      \ 'description' : ''
      \}

  let g:unite_source_menu_menus.help.command_candidates = [
    \['▷ Google                                            <SPC>ig', 'Google'],
      \]

  nnoremap <leader>hh :<C-u>Unite -silent -start-insert menu:help<CR>
