" ================ Jump ===================
" ================ Menu ===================
"
let g:menus.jump = {
    \ 'description' : ''
    \ }

let g:menus.jump.file_candidates = [
  \ ['jump.vim', '~/.config/nvim/settings/leaders/jump.vim'],
  \ ]

let g:menus.jump.command_candidates = [
    \ ['Jump tag          <leader>jt', '<C-]>'],
    \ ['Jump tag reverse  <leader>jT', '<C-t>'],
    \ ]


" ================ Mappings ===================
"
" Jump help
nnoremap <leader>jh :Denite menu:jump<CR>

" Jump operations
nnoremap <leader>jt <C-]>
nnoremap <leader>jT <C-t>
