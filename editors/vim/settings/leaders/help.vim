"""""""""""""""""""""""""""""""""""""""
" <leader>i

" Search Google
command! -nargs=+ Google !open "https://google.com/search?q=""<args>"
nnoremap <leader>ig :Google<Space>
