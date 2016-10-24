"
" Help
"
" Menu
let g:menus.help = {
  \ 'description' : ''
  \ }

let g:menus.help.file_candidates = [
  \ ['help.vim', '~/.config/nvim/settings/leaders/help.vim'],
  \ ]

let g:menus.help.command_candidates = [
  \ ['Info help  <leader>ih', 'Denite menu:help'],
  \ ['Google     <leader>ig', 'Google'],
  \ ]


"
" Mappings
"
" Help menu
nnoremap <leader>ih :Denite menu:help<CR>

" Help operations
" Search Google
command! -nargs=+ Google !open "https://google.com/search?q=""<args>"
nnoremap <leader>ig :Google<Space>
