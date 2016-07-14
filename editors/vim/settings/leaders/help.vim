" ================ Help ===================
" <leader>i

" ================ Menu ===================

let g:unite_source_menu_menus.help = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.help.command_candidates = [
  \['▷ Google                                            <leader>ig', 'Google'],
  \]

" ================ Mappings ===================

" Help menu
nnoremap <leader>ih :<C-u>Unite -silent -start-insert menu:help<CR>

" Search Google
command! -nargs=+ Google !open "https://google.com/search?q=""<args>"
nnoremap <leader>ig :Google<Space>
