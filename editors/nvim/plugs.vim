" ========================================
" Vim plugin configuration
" ========================================

if has("autocmd")
  filetype indent plugin on
endif

call plug#begin('~/.config/nvim/plugged')

" Appearance
Plug 'romainl/flattened'
Plug 'itchyny/lightline.vim'
Plug 'airblade/vim-gitgutter'
Plug 'luochen1990/rainbow' " better rainbow parentheses

" Mail
Plug 'dbeniamine/vim-mail'
Plug 'chrisbra/CheckAttach'

" Git
Plug 'mattn/gist-vim'
Plug 'mattn/webapi-vim'
Plug 'tpope/vim-fugitive'

" Languages
Plug 'sheerun/vim-polyglot'

" Project
Plug 'xolox/vim-misc'

" Ruby
Plug 'ck3g/vim-change-hash-syntax', { 'for': 'ruby' }
Plug 'ecomba/vim-ruby-refactoring', { 'for': 'ruby' }
Plug 'tpope/vim-bundler', { 'for': 'ruby' }
Plug 'tpope/vim-rails', { 'for': 'ruby' }
Plug 'tpope/vim-rake', { 'for': 'ruby' }

" Text objects
Plug 'bootleq/vim-textobj-rubysymbol', { 'for': 'ruby' }
Plug 'nelstrom/vim-textobj-rubyblock', { 'for': 'ruby' }
Plug 'coderifous/textobj-word-column.vim'
Plug 'kana/vim-textobj-user'
Plug 'ntpeters/vim-better-whitespace'
Plug 'thinca/vim-textobj-function-javascript', { 'for': 'javascript' }

" Vim improvements
Plug 'neomake/neomake'
Plug 'jiangmiao/auto-pairs'
Plug 'ervandew/supertab'
Plug 'Shougo/deoplete.nvim'
Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'
Plug 'christoomey/vim-tmux-navigator'
Plug 'tmux-plugins/vim-tmux-focus-events'
Plug 'godlygeek/tabular'
Plug 'simnalamburt/vim-mundo'
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-dispatch'
Plug 'radenling/vim-dispatch-neovim'
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-sensible'
" Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround'
Plug 'vim-scripts/AnsiEsc.vim'
Plug 'ludovicchabant/vim-gutentags'
Plug 'tsukkee/unite-tag'
Plug 'Shougo/unite.vim'
Plug 'Shougo/neomru.vim'
Plug 'Shougo/neoyank.vim'
Plug 'Shougo/vimfiler.vim'
Plug 'Shougo/vimproc.vim', { 'do' : 'make' }
Plug 'roman/golden-ratio'
Plug 'osyo-manga/unite-quickfix'
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'
Plug 'takac/vim-hardtime'
Plug 'airblade/vim-rooter'
Plug 'majutsushi/tagbar'
Plug 'kassio/neoterm'
Plug 'mhinz/vim-startify'
Plug 'janko-m/vim-test'
Plug 'justinmk/vim-sneak'

call plug#end()

augroup lazy_load_ultisnips
  autocmd!
  autocmd InsertEnter * call plug#load('ultisnips') | autocmd! lazy_load_ultisnips
augroup END
