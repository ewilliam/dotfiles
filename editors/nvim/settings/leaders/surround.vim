" ================ Surround ===================
" ================ Menu ===================
"
let g:menus.surround = {
  \ 'description' : ''
  \ }

let g:menus.surround.file_candidates = [
  \ ['surround.vim', '~/.config/nvim/settings/leaders/surround.vim'],
  \ ]

let g:menus.surround.command_candidates = [
  \ ['Surround double quotes   <leader>s"', 'ysiW"'],
  \ ['Surround #{ruby}         <leader>s#', 'ysiW#'],
  \ ['Surround single quotes   <leader>s''', 'ysiW'''],
  \ ['Surround ( parens )      <leader>s(', 'ysiW('],
  \ ['Surround (parens)        <leader>s)', 'ysiW)'],
  \ ['Surround [ brackets ]    <leader>s[', 'ysiW['],
  \ ['Surround [brackets]      <leader>s]', 'ysiW]'],
  \ ['Surround { braces }      <leader>s{', 'ysiW{'],
  \ ['Surround {braces}        <leader>s}', 'ysiW}'],
  \ ['Surround ` backticks `   <leader>s`', 'ysiW`'],
  \ ['Surround `backticks`     <leader>s`', 'ysiW`'],
  \ ]

" ================ Mappings ===================
"
" Surround help
nnoremap <leader>sh :Unite menu:surround<CR>

" Surround operations
nmap <leader>s# ysiW#
vmap <leader>s# c#{<C-R>"}<ESC>

nmap <leader>s" ysiW"
vmap <leader>s" c"<C-R>""<ESC>

nmap <leader>s' ysiW'
vmap <leader>s' c'<C-R>"'<ESC>

nmap <leader>s( ysiW(
nmap <leader>s) ysiW)
vmap <leader>s( c( <C-R>" )<ESC>
vmap <leader>s) c(<C-R>")<ESC>

nmap <leader>s] ysiW]
nmap <leader>s[ ysiW[
vmap <leader>s[ c[ <C-R>" ]<ESC>
vmap <leader>s] c[<C-R>"]<ESC>

nmap <leader>s} ysiW}
nmap <leader>s{ ysiW{
vmap <leader>s} c{ <C-R>" }<ESC>
vmap <leader>s{ c{<C-R>"}<ESC>

nmap <leader>s` ysiW`
nmap <leader>s` ysiW`
vmap <leader>s` c` <C-R>" `<ESC>
vmap <leader>s` c`<C-R>"`<ESC>
