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
  \ ['Git add %:p           <leader>ga', 'Gina add %:p<CR>'],
  \ ['Git blame             <leader>gB', 'Gina blame'],
  \ ['Git branch            <leader>gb', 'Gina branch'],
  \ ['Git browse            <leader>gr', 'Gina browse'],
  \ ['Git checkout          <leader>go', 'Gina checkout'],
  \ ['Git commit            <leader>gc', 'Gina commit'],
  \ ['Git diff              <leader>gd', 'Gina diff'],
  \ ['Git log               <leader>gl', 'Gina log'],
  \ ['Git pull              <leader>gp', 'Gina pull'],
  \ ['Git push              <leader>gP', 'Gina push'],
  \ ['Git status            <leader>gs', 'Gina status'],
  \ ]

"
" Mappings
"
" Git help
nnoremap <leader>gh :Denite menu:git<CR>

" Git operations
nnoremap <leader>ga   :Gina add %:p<CR><CR>
nnoremap <leader>gb   :Gina branch<space>
nnoremap <leader>gB   :Gina blame<CR>
nnoremap <leader>gr   :Gina browse
nnoremap <leader>gc   :Gina commit<CR>
nnoremap <leader>go   :Gina checkout<space>
nnoremap <leader>gd   :Gina diff<CR>
nnoremap <leader>gl   :Gina log<CR>
nnoremap <leader>gp   :Gina pull<CR>
nnoremap <leader>gP   :Gina push<CR>
nnoremap <leader>gs   :Gina status<CR>
