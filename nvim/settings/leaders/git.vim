"
" Git
"
" Menu
let g:menus.git = {
  \ 'description' : ''
  \ }

let g:menus.git.file_candidates = [
  \ ['git.vim', '~/.config/nvim/settings/leaders/git.vim'],
  \ ]

let g:menus.git.command_candidates = [
  \ ['Git help              <leader>gh', 'Denite menus:git'],
  \ ['Git blame             <leader>gB', 'Gblame'],
  \ ['Git browse            <leader>gbr', 'Gbrowse'],
  \ ['Git commit -v -q      <leader>gc', 'Gcommit -v -q'],
  \ ['Git commit -v -q %:p  <leader>gt', 'Gcommit -v -q %:p'],
  \ ['Git diff              <leader>gd', 'Gdiff'],
  \ ['Git edit              <leader>ge', 'Gedit'],
  \ ['Git add %:p           <leader>ga', 'Git add %:p<CR>'],
  \ ['Git branch            <leader>gb', 'Git branch'],
  \ ['Git checkout          <leader>gco', 'Git checkout'],
  \ ['Git log               <leader>gl', 'Git log'],
  \ ['Git move              <leader>gm', 'Gmove'],
  \ ['Git pull              <leader>gp', 'Gpull'],
  \ ['Git push              <leader>gP', 'Gpush'],
  \ ['Git read              <leader>gr', 'Gread'],
  \ ['Git status            <leader>gs', 'Gstatus'],
  \ ['Git write             <leader>gw', 'Gwrite<CR>'],
  \ ['diffget               <leader>gdg', 'diffget'],
  \ ['diffput               <leader>gdp', 'diffput'],
  \ ]

"
" Mappings
"
" Git help
nnoremap <leader>gh :Denite menu:git<CR>

" Git operations
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
