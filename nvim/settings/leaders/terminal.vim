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
  \ ['Terminal start     <leader>ts', 'terminal'],
  \ ]

"
" Mappings
"
" Terminal help
nnoremap <leader>th :Denite menu:terminal<CR>

" Terminal new
nnoremap <leader>ts :Tnew<CR>

" Terminal open
nnoremap <leader>to :Topen<CR>

" Terminal toggle
nnoremap <leader>tt :Ttoggle<CR>

" Terminal next
nnoremap <leader>tn :Tnext<CR>

" Terminal previous
nnoremap <leader>tp :Tprevious<CR>

" Terminal clear
nnoremap <leader>tl :<c-u>exec v:count.'Tclear'<cr>

" Terminal expo start
nnoremap <leader>te :T expo start<cr>

" Terminal rails server
nnoremap <leader>tr :T rails server<cr>
