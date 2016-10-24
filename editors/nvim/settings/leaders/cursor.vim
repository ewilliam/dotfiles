" ================ Cursor ===================
" ================ Menu ===================
"
let g:menus.cursor = {
  \ 'description': ''
  \ }

let g:menus.cursor.file_candidates = [
  \ ['cursor.vim', '~/.config/nvim/settings/leaders/cursor.vim'],
  \ ]

let g:menus.cursor.command_candidates = [
  \ ['Cursor help <leader>ch', 'Denite menu:cursor'],
  \ ['Cursor grep <leader>cg', 'DeniteCursorWord grep'],
  \ ]


" ================ Mappings ===================
"
" Cursor help
nnoremap <leader>ch :Denite menu:cursor<CR>

" Cursor operations
nnoremap <leader>cg :DeniteCursorWord grep<CR>
