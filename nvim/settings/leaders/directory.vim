"
" Directory
"
" Menu
let g:menus.directory = {
  \ 'description': 'Navigate folders'
  \ }

let g:menus.directory.file_candidates = [
  \ ['directory.vim', '~/.config/nvim/settings/leaders/directory.vim'],
  \ ]

let g:menus.directory.command_candidates = [
  \ ['Directory help    <leader>dh', 'Denite menu:directory'],
  \ ['Directory find    <leader>df', 'Denite directory_rec'],
  \ ['Directory explore <leader>de', 'VimFilerSplit -winwidth=50 -force-quit'],
  \ ]

"
" Mappings
"
" Directory help
nnoremap <leader>dh :Denite menu:directory<CR>

" Directory operations
nnoremap <leader>ds :Denite directory_rec<CR>
nnoremap <leader>de :VimFilerSplit -winwidth=50 -force-quit<CR>
