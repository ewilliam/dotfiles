"
" Session
"
" Menu
let g:menus.session = {
  \ 'description' : ''
  \ }

let g:menus.git.file_candidates = [
  \ ['session.vim', '~/.config/nvim/settings/leaders/session.vim'],
  \ ]

let g:menus.git.command_candidates = [
  \ ['Session help              <leader>sh', 'Denite menus:session'],
  \ ['Session save              <leader>so', 'SessionSave'],
  \ ['Session browse            <leader>sb', 'Denite session'],
  \ ['Session delete            <leader>sb', 'SessionDelete'],
  \ ]

nnoremap <leader>ss   :SessionSave<space>
nnoremap <leader>so   :SessionOpen<CR>
nnoremap <leader>sr   :RestartVim<CR>
nnoremap <leader>sb   :Denite session<CR>
nnoremap <leader>sd   :SessionDelete<CR>
