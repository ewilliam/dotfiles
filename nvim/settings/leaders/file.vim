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
  \ ['File find    <leader>ff', 'Denite -start-filter file/rec'],
  \ ['File recent  <leader>fr', 'Denite -start-filter file_mru'],
  \ ['File line    <leader>fl', 'Denite -start-filter line'],
  \ ['File menu    <leader>fm', 'Denite -start-filter menu'],
  \ ['File mark    <leader>fk', 'Denite -start-filter mark'],
  \ ['File grep    <leader>fg', 'Denite grep'],
  \ ['File explore <leader>fe', 'Ranger'],
  \ ['File explore <leader>fw', 'RangerWorkingDirectory'],
  \ ['File changed <leader>fc', 'OpenChangedFiles'],
  \ ]

"
" Mappings
"
" File help
nnoremap <leader>fh :Denite menu:file<CR>

" File operations
nnoremap <leader>ff :Denite -start-filter file/rec<CR>
nnoremap <leader>fr :Denite -start-filter file_mru<CR>
nnoremap <leader>fl :Denite -start-filter line<CR>
nnoremap <leader>fm :Denite -start-filter menu<CR>
nnoremap <leader>fk :Denite -start-filter mark<CR>
nnoremap <leader>fg :Denite grep<CR>
nnoremap <leader>fb :Ranger<CR>
nnoremap <leader>fe :RangerWorkingDirectory<CR>
nnoremap <leader>fc :OpenChangedFiles<CR>
