"
" File
"
" Menu
let g:menus.file = {
  \ 'description': 'Navigate folders'
  \ }

let g:menus.file.file_candidates = [
  \ ['file.vim', '~/.config/nvim/settings/leaders/file.vim'],
  \ ]

let g:menus.file.command_candidates = [
  \ ['File help    <leader>fh', 'Denite menu:file'],
  \ ['File find    <leader>ff', 'Denite file_rec'],
  \ ['File recent  <leader>fr', 'Denite file_mru'],
  \ ['File browse  <leader>fb', 'Ranger'],
  \ ['File explore <leader>fe', 'RangerWorkingDirectory'],
  \ ['File grep    <leader>fg', 'Denite grep'],
  \ ['File changed <leader>fc', 'OpenChangedFiles'],
  \ ]

"
" Mappings
"
" File help
nnoremap <leader>fh :Denite menu:file<CR>

" File operations
nnoremap <leader>ff :Denite file_rec<CR>
nnoremap <leader>fr :Denite file_mru<CR>
nnoremap <leader>fb :Ranger<CR>
nnoremap <leader>fe :RangerWorkingDirectory<CR>
nnoremap <leader>fg :Denite grep<CR>
nnoremap <leader>fc :OpenChangedFiles<CR>
