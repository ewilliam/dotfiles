"
" Terminal
"
" Menu
let g:menus.terminal = {
  \ 'description' : ''
  \ }

let g:menus.terminal.file_candidates = [
  \ ['terminal.vim', '~/.config/nvim/settings/leaders/terminal.vim'],
  \ ]

let g:menus.terminal.command_candidates = [
  \ ['Terminal dispatch  <leader>td', 'Dispatch'],
  \ ['Terminal start     <leader>ts', 'Start'],
  \ ]

"
" Mappings
"
" Terminal help
nnoremap <leader>th :Denite menu:terminal<CR>

" Terminal operations
nnoremap <leader>td :Dispatch<CR>
nnoremap <leader>ts :Start<CR>
