" ================ Surround ===================
" <leader>s

" ================ Menu ===================

let g:unite_source_menu_menus.surround = {
  \ 'description' : ''
  \}

let g:unite_source_menu_menus.surround.command_candidates = [
  \['▷ ysiW"                                             <leader>s"', 'ysiW"'],
  \['▷ ysiW#                                             <leader>s#', 'ysiW#'],
  \['▷ ysiW''                                            <leader>s''', 'ysiW'''],
  \['▷ ysiW(                                             <leader>s(', 'ysiW('],
  \['▷ ysiW)                                             <leader>s)', 'ysiW)'],
  \['▷ ysiW[                                             <leader>s[', 'ysiW['],
  \['▷ ysiW]                                             <leader>s]', 'ysiW]'],
  \['▷ ysiW`                                             <leader>s`', 'ysiW`'],
  \['▷ ysiW`                                             <leader>s`', 'ysiW`'],
  \['▷ ysiW{                                             <leader>s{', 'ysiW{'],
  \['▷ ysiW}                                             <leader>s}', 'ysiW}'],
  \]

" ================ Mappings ===================

" Surround help
nnoremap <leader>sh :<C-u>Unite -silent -start-insert menu:surround<CR>

" <leader># Surround a word with #{ruby interpolation}
nmap <leader>s# ysiW#
vmap <leader>s# c#{<C-R>"}<ESC>

" <leader>" Surround a word with "quotes"
nmap <leader>s" ysiW"
vmap <leader>s" c"<C-R>""<ESC>

" <leader>' Surround a word with 'single quotes'
nmap <leader>s' ysiW'
vmap <leader>s' c'<C-R>"'<ESC>

" <leader>) or ,( Surround a word with (parens)
" The difference is in whether a space is put in
nmap <leader>s( ysiW(
nmap <leader>s) ysiW)
vmap <leader>s( c( <C-R>" )<ESC>
vmap <leader>s) c(<C-R>")<ESC>

" <leader>[ Surround a word with [brackets]
nmap <leader>s] ysiW]
nmap <leader>s[ ysiW[
vmap <leader>s[ c[ <C-R>" ]<ESC>
vmap <leader>s] c[<C-R>"]<ESC>

" <leader>{ Surround a word with {braces}
nmap <leader>s} ysiW}
nmap <leader>s{ ysiW{
vmap <leader>s} c{ <C-R>" }<ESC>
vmap <leader>s{ c{<C-R>"}<ESC>

" <leader>` Surround a word with `backticks`
nmap <leader>s` ysiW`
nmap <leader>s` ysiW`
vmap <leader>s` c` <C-R>" `<ESC>
vmap <leader>s` c`<C-R>"`<ESC>
