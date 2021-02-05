"
" Plugins
"
call plug#begin('~/.config/nvim/plugged')

" Appearance
Plug 'morhetz/gruvbox'
Plug 'hoob3rt/lualine.nvim'
Plug 'kyazdani42/nvim-web-devicons'
Plug 'kshenoy/vim-signature'

" Mail
Plug 'dbeniamine/vim-mail'
Plug 'chrisbra/CheckAttach'

" Git
Plug 'lambdalisue/gina.vim'
" Plug 'mattn/gist-vim'
" Plug 'mattn/webapi-vim' " gist.vim dependency

" Languages
Plug 'w0rp/ale'
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'sheerun/vim-polyglot'
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}

" Text editing
Plug 'honza/vim-snippets'
Plug 'godlygeek/tabular'
Plug 'tpope/vim-commentary'
Plug 'tpope/vim-surround'
Plug 'takac/vim-hardtime'
Plug 'coderifous/textobj-word-column.vim'

" Neovim improvements
Plug 'justinmk/vim-sneak'
Plug 'tpope/vim-sleuth'
Plug 'simnalamburt/vim-mundo'
Plug 'nikvdp/neomux'
" Plug 'Shougo/denite.nvim', { 'do': ':UpdateRemotePlugins' }
" Plug 'Shougo/neomru.vim'
" Plug 'kassio/neoterm'
Plug 'ntpeters/vim-better-whitespace'
" Plug 'roman/golden-ratio'
Plug 'airblade/vim-rooter'
Plug 'majutsushi/tagbar'
Plug 'ludovicchabant/vim-gutentags'
Plug 'mhinz/vim-startify'
Plug 'glepnir/indent-guides.nvim'
" Plug 'janko-m/vim-test'
" Plug 'thaerkh/vim-workspace'

" External tools
Plug 'francoiscabrol/ranger.vim'
Plug 'rbgrouleff/bclose.vim' " ranger.vim dependency
" Plug 'shime/vim-livedown'

call plug#end()
