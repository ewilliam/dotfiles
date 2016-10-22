" ================ History ===================
" <leader>h

" ================ Menu ===================

let g:unite_source_menu_menus.history = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.history.command_candidates = [
  \['▷ <C-u>Unite history/yank                           <leader>hy', '<C-u>Unite history/yank'],
  \['▷ GundoToggle                                       <leader>hu', 'GundoToggle'],
  \]

" ================ Mappings ===================

" History help
nnoremap <leader>hh :<C-u>Unite -silent -start-insert menu:history<CR>

" History yank
nnoremap <leader>hy :<C-u>Unite history/yank<CR>

" History undo
nnoremap <leader>hu :MundoToggle<CR>

" History search
nnoremap <leader>hs :History<CR>
