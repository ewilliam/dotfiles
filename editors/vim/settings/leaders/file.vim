" ================ File ===================
" <leader>f

" ================ Menu ===================

let g:unite_source_menu_menus.file = {
    \ 'description' : ''
    \}

let g:unite_source_menu_menus.file.command_candidates = [
  \['▷ GitFiles                                       <leader>fs', 'GitFiles'],
  \['▷ Files                                          <leader>ff', 'Files'],
  \['▷ <C-u>VimFilerSplit -winwidth=50 -force-quit    <leader>fe', '<C-u>VimFilerSplit -winwidth=50 -force-quit'],
  \['▷ OpenChangedFiles                               <leader>fc', 'OpenChangedFiles'],
  \['▷ Unite grep                                     <leader>fg', 'Unite grep'],
  \]

" ================ Mappings ===================

" File help
nnoremap <leader>fh :<C-u>Unite -silent -start-insert menu:file<CR>

" File search git
nnoremap <leader>fs :GitFiles<CR>

" File find all
nnoremap <leader>ff :Files<CR>

" File explore
nnoremap <leader>fe :<C-u>VimFilerBufferDir -split -winwidth=50 -auto-cd -force-quit<CR>

" Files changed
nnoremap <leader>fc :OpenChangedFiles<CR>

" File grep
nnoremap <leader>fg :Unite grep:.<cr>

" File tab open
nnoremap <leader>ft :Unite file_rec/async -default-action=tabopen<cr>

" File async open
nnoremap <leader>fa :Unite file_rec/async<cr>

" File find
" nnoremap <leader>ff :<c-u>Unite -no-split -buffer-name=files   -start-insert file<cr>

" File recent
nnoremap <leader>fr :<c-u>Unite -no-split -buffer-name=mru     -start-insert file_mru<cr>

" File buffer
nnoremap <leader>fb :<c-u>Unite -no-split -buffer-name=buffer  buffer<cr>
