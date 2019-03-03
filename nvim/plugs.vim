"
" Plugins
"
call plug#begin('~/.config/nvim/plugged')

" Appearance
Plug 'morhetz/gruvbox'
Plug 'itchyny/lightline.vim'
Plug 'mhinz/vim-signify'
Plug 'kshenoy/vim-signature'
" Plug 'luochen1990/rainbow'

" Mail
Plug 'dbeniamine/vim-mail'
Plug 'chrisbra/CheckAttach'

" Git
Plug 'lambdalisue/gina.vim'
Plug 'mattn/gist-vim'
Plug 'mattn/webapi-vim' " gist.vim dependency

" Languages
Plug 'w0rp/ale'
Plug 'neoclide/coc.nvim', {'tag': '*', 'do': { -> coc#util#install()}}
" Plug 'sheerun/vim-polyglot'

" Text editing
Plug 'honza/vim-snippets'
Plug 'godlygeek/tabular'
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-surround'
Plug 'jiangmiao/auto-pairs'
Plug 'takac/vim-hardtime'
Plug 'coderifous/textobj-word-column.vim'

" Neovim improvements
Plug 'justinmk/vim-sneak'
Plug 'tpope/vim-sleuth'
" Plug 'xolox/vim-session'
" Plug 'xolox/vim-misc' " session.vim dependency
" Plug 'rafi/vim-denite-session'
Plug 'simnalamburt/vim-mundo'
Plug 'Shougo/denite.nvim'
Plug 'Shougo/neoyank.vim'
Plug 'Shougo/neomru.vim'
Plug 'ntpeters/vim-better-whitespace'
Plug 'roman/golden-ratio'
Plug 'airblade/vim-rooter'
Plug 'majutsushi/tagbar'
Plug 'ludovicchabant/vim-gutentags'
Plug 'mhinz/vim-startify'
Plug 'janko-m/vim-test'

" External tools
Plug 'francoiscabrol/ranger.vim'
Plug 'rbgrouleff/bclose.vim' " ranger.vim dependency
Plug 'shime/vim-livedown'

call plug#end()
