"""""""""""""""""""""""""""""""""""""""
" <leader>f
" File mappings

" File search
nnoremap <leader>fs :GitFiles<CR>

" File explore
nnoremap <leader>fe :<C-u>VimFilerSplit -winwidth=50 -force-quit<CR>

" Files changed
nnoremap <leader>fc :OpenChangedFiles<CR>

" File grep
" nnoremap <leader>fg :Ag<CR>
" nnoremap <leader>fg :Unite Ag:.<cr>

nnoremap <leader>fa :Unite file_rec/async<cr>
nnoremap <leader>ft :<C-u>Unite -no-split -buffer-name=files   -start-insert file_rec/async:!<cr>
nnoremap <leader>ff :<C-u>Unite -no-split -buffer-name=files   -start-insert file<cr>
nnoremap <leader>fr :<C-u>Unite -no-split -buffer-name=mru     -start-insert file_mru<cr>
nnoremap <leader>fb :<C-u>Unite -no-split -buffer-name=buffer  buffer<cr>
