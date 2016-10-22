" ================ Cursor ===================
" <leader>c

" ================ Menu ===================

let g:unite_source_menu_menus.cursor = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.cursor.command_candidates = [
  \['▷ UniteWithCursorWord grep:.                        <leader>cg', 'UniteWithCursorWord grep:.'],
  \]

" ================ Mappings ===================

" Cursor help
nnoremap <leader>ch :<C-u>Unite -silent -start-insert menu:cursor<CR>

" Cursor grep
nnoremap <leader>cg :UniteWithCursorWord grep:.<CR>
