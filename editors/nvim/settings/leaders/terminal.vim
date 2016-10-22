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

" ================ Mappings ===================

nnoremap <leader>th :<C-u>Unite -silent -start-insert menu:terminal<CR>

" Terminal dispatch
nnoremap <leader>td :Dispatch<CR>

" Start terminal in new tab via Dispatch
nnoremap <leader>ts :Start<CR>
nnoremap <leader>tc :Start<Space>
