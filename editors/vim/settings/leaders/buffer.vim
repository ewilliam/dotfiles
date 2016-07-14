" ================ Buffers ===================
" <leader>b

" ================ Menu ===================

let g:unite_source_menu_menus.buffer = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.buffer.command_candidates = [
  \['▷ <C-u>Unite -quick-match buffer                    <leader>bs', '<C-u>Unite -quick-match buffer'],
  \['▷ bdelete                                           <leader>bd', 'bdelete'],
  \['▷ bnext                                             <leader>bn', 'bnext'],
  \['▷ bprev                                             <leader>bp', 'bprev'],
\]

" ================ Mappings ===================

" Buffer help
nnoremap <leader>bh :<C-u>Unite -silent -start-insert menu:buffer<CR>

" Buffer search
nnoremap <leader>bs :Buffers<CR>

" Buffer delete
nnoremap <leader>bd :bdelete<CR>

" Buffer next/prev
nnoremap <leader>bn :bnext<CR>
nnoremap <leader>bp :bprev<CR>
