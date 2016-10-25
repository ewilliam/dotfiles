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
Plug 'luochen1990/rainbow'

" Mail
Plug 'dbeniamine/vim-mail'
Plug 'chrisbra/CheckAttach'

" Git
Plug 'tpope/vim-fugitive'
Plug 'mattn/gist-vim'
Plug 'mattn/webapi-vim' " gist.vim dependency

" Languages
Plug 'sheerun/vim-polyglot'
Plug 'slashmili/alchemist.vim'

" Ruby
Plug 'tpope/vim-bundler', { 'for': 'ruby' }
Plug 'tpope/vim-rake', { 'for': 'ruby' }
Plug 'tpope/vim-rails', { 'for': 'ruby' }
Plug 'killphi/vim-ruby-refactoring', { 'for': 'ruby' }
Plug 'ck3g/vim-change-hash-syntax', { 'for': 'ruby' }

" Text objects
Plug 'bootleq/vim-textobj-rubysymbol', { 'for': 'ruby' }
Plug 'nelstrom/vim-textobj-rubyblock', { 'for': 'ruby' }
Plug 'thinca/vim-textobj-function-javascript', { 'for': 'javascript' }
Plug 'coderifous/textobj-word-column.vim'
Plug 'kana/vim-textobj-user'
Plug 'ntpeters/vim-better-whitespace'

" Text editing
Plug 'justinmk/vim-sneak'
Plug 'Shougo/deoplete.nvim'
Plug 'ervandew/supertab'
Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'
Plug 'godlygeek/tabular'
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-surround'
Plug 'jiangmiao/auto-pairs'
Plug 'takac/vim-hardtime'

" Neovim improvements
Plug 'tpope/vim-sensible'
Plug 'luochen1990/indent-detector.vim'
Plug 'neomake/neomake'
Plug 'kassio/neoterm'
Plug 'simnalamburt/vim-mundo'
Plug 'Shougo/denite.nvim'
Plug 'Shougo/neoyank.vim'
Plug 'Shougo/neomru.vim'
Plug 'Shougo/vimproc.vim', {'do' : 'make'}
" Plug 'Shougo/vimfiler.vim'
Plug 'roman/golden-ratio'
Plug 'airblade/vim-rooter'
Plug 'majutsushi/tagbar'
Plug 'ludovicchabant/vim-gutentags'
Plug 'mhinz/vim-startify'
Plug 'janko-m/vim-test'

call plug#end()

augroup lazy_load_ultisnips
  autocmd!
  autocmd InsertEnter * call plug#load('ultisnips') | autocmd! lazy_load_ultisnips
augroup END
