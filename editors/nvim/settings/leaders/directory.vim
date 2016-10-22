" ================ Directory ===================
" <leader>d

" ================ Menu ===================

let g:unite_source_menu_menus.directory = {
    \ 'description' : ''
    \}

let g:unite_source_menu_menus.directory.command_candidates = [
  \['▷ GitFiles                                       <leader>fs', 'GitFiles'],
  \]

" ================ Mappings ===================

" File help
nnoremap <leader>dh :<C-u>Unite -silent -start-insert menu:directory<CR>

" File search git
nnoremap <leader>dc :lcd %:p:h<CR>
