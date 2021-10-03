"
" Keymaps
"
" Stop pressing shift all the time
nnoremap ; :
nnoremap : ;
vnoremap ; :
vnoremap : ;

" Split windows
nnoremap <silent> vv <C-w>v
nnoremap <silent> ss <C-w>s

" Create tabs
nnoremap <silent> tt :tabnew<CR>

" Make 0 go to the first character rather than the beginning
" of line. Use ^ for the traditional beginning of line.
nnoremap 0 ^
nnoremap ^ 0

" Clear current search highlight by double tapping //
nnoremap // :nohlsearch<CR>

" Jump to marked line and column with '<char>
nnoremap ' `
nnoremap ` '

" Move past quotes, parens, brackets, etc while in insert mode
" imap <C-j> <ESC>ea

" Move between split panes
nnoremap <C-j> <C-w><C-j>
nnoremap <C-k> <C-w><C-k>
nnoremap <C-l> <C-w><C-l>
nnoremap <C-h> <C-w><C-h>

" Navigate the terminal
" https://github.com/neovim/neovim/wiki/FAQ#my-ctrl-h-mapping-doesnt-work
tnoremap <C-j> <C-\><C-n><C-w>j
tnoremap <C-k> <C-\><C-n><C-w>k
tnoremap <C-h> <C-\><C-n><C-w>h
tnoremap <C-l> <C-\><C-n><C-w>l
" Escape Terminal mode
tnoremap <nowait> <ESC><ESC> <C-\><C-n>
