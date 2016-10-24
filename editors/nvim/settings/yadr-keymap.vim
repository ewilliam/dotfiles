" ========================================
" General vim sanity improvements
" ========================================
"
"

" Stop pressing shift all the time
nnoremap ; :
nnoremap : ;
vnoremap ; :
vnoremap : ;

" Create window splits easier. The default
" way is Ctrl-w,v and Ctrl-w,s. Remapped
" to vv and ss
nnoremap <silent> vv <C-w>v
nnoremap <silent> ss <C-w>s

" Create tabs
nnoremap <silent> tt :tabnew<CR>

" Alt mappings for next and prev buffer
nnoremap <silent><a-h> :bnext<CR>
nnoremap <silent><a-l> :bprev<CR>

" Make 0 go to the first character rather than the beginning
" of the line. When we're programming, we're almost always
" interested in working with text rather than empty space. If
" you want the traditional beginning of line, use ^
nnoremap 0 ^
nnoremap ^ 0

"Go to last edit location with <leader>.

"Clear current search highlight by double tapping //
nnoremap // :nohlsearch<CR>

" These are very similar keys. Typing 'a will jump to the line in the current
" file marked with ma. However, `a will jump to the line and column marked
" with ma.  It’s more useful in any case I can imagine, but it’s located way
" off in the corner of the keyboard. The best way to handle this is just to
" swap them: http://items.sjbach.com/319/configuring-vim-right
nnoremap ' `
nnoremap ` '

"When typing a string, your quotes auto complete. Move past the quote
"while still in insert mode by hitting Ctrl-j. Example:
"
" type 'foo<c-j>
"
" the first quote will autoclose so you'll get 'foo' and hitting <c-j> will
" put the cursor right after the quote
imap <C-j> <esc>ea

" Move between split panes
nnoremap <C-J> <C-W><C-J>
nnoremap <C-K> <C-W><C-K>
nnoremap <C-L> <C-W><C-L>
nnoremap <C-H> <C-W><C-H>

if has('nvim') && exists(':tnoremap')
  " Navigating the terminals
  " https://github.com/neovim/neovim/wiki/FAQ#my-ctrl-h-mapping-doesnt-work
  tnoremap <c-j> <c-\><c-n><c-w>j
  tnoremap <c-k> <c-\><c-n><c-w>k
  tnoremap <c-h> <c-\><c-n><c-w>h
  tnoremap <c-l> <c-\><c-n><c-w>l
  " Escape Terminal mode
  tnoremap <nowait> <esc><esc> <C-\><C-n>
endif
