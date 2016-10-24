" ================ History ===================
" ================ Menu ===================
"
let g:menus.history = {
  \ 'description' : ''
  \ }

let g:menus.history.file_candidates = [
  \ ['history.vim', '~/.config/nvim/settings/leaders/history.vim'],
  \ ]

let g:menus.history.command_candidates = [
  \ ['History help  <leader>hh', 'Denite menu:history'],
  \ ['History undo  <leader>hu', 'MundoToggle'],
  \ ['History yank  <leader>hy', 'Denite neoyank'],
  \ ]


" ================ Mappings ===================
"
" History help
nnoremap <leader>hh :Denite menu:history<CR>

" History operations
nnoremap <leader>hu :MundoToggle<CR>
nnoremap <leader>hy :Denite neoyank<CR>
