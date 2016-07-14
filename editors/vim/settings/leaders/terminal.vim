" ================ Terminal ===================
" <leader>t

" ================ Menu ===================

let g:unite_source_menu_menus.terminal = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.terminal.command_candidates = [
  \['▷ Dispatch                                          <leader>td', 'Dispatch'],
  \['▷ Start                                             <leader>ts', 'Start'],
  \]

nnoremap <leader>th :<C-u>Unite -silent -start-insert menu:terminal<CR>

" ================ Menu ===================

" Terminal dispatch
nnoremap <leader>td :Dispatch<CR>

" Terminal start
nnoremap <leader>ts :Start fish<CR>
nnoremap <leader>tc :Start fish<Space>
