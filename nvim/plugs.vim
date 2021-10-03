"
" Plugins
"
call plug#begin('~/.config/nvim/plugged')

" Appearance
Plug 'rktjmp/lush.nvim'
Plug 'ellisonleao/gruvbox.nvim'
Plug 'hoob3rt/lualine.nvim'
Plug 'kyazdani42/nvim-web-devicons'
Plug 'romgrk/barbar.nvim'
Plug 'kshenoy/vim-signature'
Plug 'p00f/nvim-ts-rainbow'
Plug 'glepnir/indent-guides.nvim'
Plug 'norcalli/nvim-colorizer.lua'

" Mail
Plug 'dbeniamine/vim-mail'
Plug 'chrisbra/CheckAttach'

" Git
Plug 'lewis6991/gitsigns.nvim'
Plug 'TimUntersberger/neogit'

" Languages
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
Plug 'romgrk/nvim-treesitter-context'
Plug 'arkav/lualine-lsp-progress'
Plug 'neovim/nvim-lspconfig'
Plug 'glepnir/lspsaga.nvim'
Plug 'hrsh7th/nvim-cmp'
Plug 'hrsh7th/cmp-nvim-lsp'
Plug 'tzachar/cmp-tabnine', { 'do': './install.sh' }
Plug 'hrsh7th/cmp-buffer'
Plug 'hrsh7th/vim-vsnip'
Plug 'hrsh7th/cmp-vsnip'
Plug 'rafamadriz/friendly-snippets'
Plug 'quangnguyen30192/cmp-nvim-tags'
Plug 'onsails/lspkind-nvim'

"
" Text editing
Plug 'b3nj5m1n/kommentary'
Plug 'JoosepAlviste/nvim-ts-context-commentstring'
Plug 'AndrewRadev/tagalong.vim'
Plug 'blackcauldron7/surround.nvim'
Plug 'takac/vim-hardtime'
Plug 'windwp/nvim-autopairs'
Plug 'windwp/nvim-ts-autotag'

" Windows/Buffers
Plug 'beauwilliams/focus.nvim'
Plug 'sindrets/winshift.nvim'
Plug 'famiu/bufdelete.nvim'

" Neovim improvements
Plug 'ggandor/lightspeed.nvim'
Plug 'simnalamburt/vim-mundo'
Plug 'nikvdp/neomux'
Plug 'nvim-lua/popup.nvim'
Plug 'nvim-lua/plenary.nvim'
Plug 'nvim-telescope/telescope.nvim'
Plug 'ntpeters/vim-better-whitespace'
Plug 'ahmedkhalf/project.nvim'
Plug 'majutsushi/tagbar'
Plug 'mhinz/vim-startify'
Plug 'yamatsum/nvim-cursorline'
Plug 'kyazdani42/nvim-tree.lua'
Plug 'rmagatti/auto-session'
Plug 'andymass/vim-matchup'
Plug 'windwp/nvim-spectre'
Plug 'kevinhwang91/nvim-hlslens'

" External tools
Plug 'kevinhwang91/rnvimr'
Plug 'ludovicchabant/vim-gutentags'
Plug 'ellisonleao/glow.nvim', {'do': ':GlowInstall'}

call plug#end()
