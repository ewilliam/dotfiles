"
" Buffers
"
" Menu
let g:menus.buffer = {
  \ 'description': 'Manage buffers'
  \ }

let g:menus.buffer.file_candidates = [
  \ ['buffer.vim', '~/.config/nvim/settings/leaders/buffer.vim'],
  \ ]

let g:menus.buffer.command_candidates = [
  \ ['Buffer help     <leader>bh', 'Denite menu:buffer'],
  \ ['Buffer delete   <leader>bc', 'Bclose'],
  \ ['Buffer delete   <leader>bd', 'bdelete'],
  \ ['Buffer next     <leader>bn', 'bnext'],
  \ ['Buffer previous <leader>bn', 'bprev'],
  \ ]

"
"  Mappings
"
" Buffer help
nnoremap <leader>bh :Denite menu:buffer<CR>

" Buffer operations
nnoremap <leader>bs :Denite -start-filter buffer<CR>
nnoremap <leader>bc :Bclose<CR>
nnoremap <leader>bd :bdelete<CR>
nnoremap <leader>bn :bnext<CR>
nnoremap <leader>bp :bprev<CR>
