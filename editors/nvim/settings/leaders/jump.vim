" ================ Jump ===================
" <leader>j

" ================ Menu ===================

let g:unite_source_menu_menus.jump = {
    \ 'description' : ''
    \}

let g:unite_source_menu_menus.jump.command_candidates = [
    \['▷ <C-]>                                             <leader>jt', '<C-]>'],
    \]

" ================ Mappings ===================

nnoremap <leader>jh :<C-u>Unite -silent -start-insert menu:jump<CR>

" Jump to tag
nnoremap <leader>jt <C-]>
