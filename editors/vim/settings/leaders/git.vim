" ================ Git ===================
" <leader>g
" heavy use of vim-fugitive

" ================ Menu ===================

let g:unite_source_menu_menus.git = {
    \ 'description' : ''
    \}

let g:unite_source_menu_menus.git.command_candidates = [
  \['▷ Gblame                                            <leader>gB', 'Gblame'],
  \['▷ Gbrowse                                           <leader>gbr', 'Gbrowse'],
  \['▷ Gcommit -v -q                                     <leader>gc', 'Gcommit -v -q'],
  \['▷ Gcommit -v -q %:p                                 <leader>gt', 'Gcommit -v -q %:p'],
  \['▷ Gdiff                                             <leader>gd', 'Gdiff'],
  \['▷ Gedit                                             <leader>ge', 'Gedit'],
  \['▷ Git add %:p<CR>                                   <leader>ga', 'Git add %:p<CR>'],
  \['▷ Git branch                                        <leader>gb', 'Git branch'],
  \['▷ Git checkout                                      <leader>gco', 'Git checkout'],
  \['▷ Git log                                           <leader>gl', 'Git log'],
  \['▷ Gmove                                             <leader>gm', 'Gmove'],
  \['▷ Gpull                                             <leader>gp', 'Gpull'],
  \['▷ Gpush                                             <leader>gP', 'Gpush'],
  \['▷ Gread                                             <leader>gr', 'Gread'],
  \['▷ Gstatus                                           <leader>gs', 'Gstatus'],
  \['▷ Gwrite<CR>                                        <leader>gw', 'Gwrite<CR>'],
  \['▷ diffget                                           <leader>gdg', 'diffget'],
  \['▷ diffput                                           <leader>gdp', 'diffput'],
  \]

" ================ Mappings ===================

nnoremap <leader>gh :<C-u>Unite -silent -start-insert menu:git<CR>
nnoremap <leader>ga   :Git add %:p<CR><CR>
nnoremap <leader>gb   :Git branch<space>
nnoremap <leader>gB   :Gblame<CR>
nnoremap <leader>gbr  :Gbrowse
nnoremap <leader>gc   :Gcommit -v -q<CR>
nnoremap <leader>gco  :Git checkout<space>
nnoremap <leader>gd   :Gdiff<CR>
nnoremap <leader>gdg  :diffget<CR>
nnoremap <leader>gdp  :diffput<CR>
nnoremap <leader>ge   :Gedit<CR>
nnoremap <leader>gl   :Git log<CR>
nnoremap <leader>gm   :Gmove<space>
nnoremap <leader>gp   :Gpull<CR>
nnoremap <leader>gP   :Gpush<CR>
nnoremap <leader>gr   :Gread<CR>
nnoremap <leader>gs   :Gstatus<CR>
nnoremap <leader>gt   :Gcommit -v -q %:p<CR>
nnoremap <leader>gw   :Gwrite<CR><CR>
