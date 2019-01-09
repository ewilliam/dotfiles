"
" General Config
"
set mouse=a           " Enable mouse support
set number            " Line numbers are good
set showmode          " Show current mode
set gcr=a:blinkon0    " Disable cursor blink
set visualbell        " No sounds
set clipboard=unnamed " Share with system clipboard
set hidden            " Background buffers
set termguicolors     " Colorize terminal

let mapleader = "\<Space>"

"
" Search
"
set hlsearch        " Highlight searches by default
set viminfo='100,f1 " Save up to 100 marks, enable capital marks
set ignorecase      " Ignore case when searching...
set smartcase       " ...unless we type a capital

"
" Scrolling | Splitting | Folds
"
set sidescroll=1      " Horizontal scroll 1 character per time
set scrolloff=8       " 8 lines of context above/below cursor
set splitbelow        " Horizontal split below
set splitright        " Vertical split below
set foldmethod=indent " Fold based on indent
set foldnestmax=3     " Deepest fold is 3 levels
set nofoldenable      " Don't fold by default

"
" Turn Off Swap Files
"
set noswapfile
set nobackup
set nowb

"
" Persistent Undo
"
" Keep undo history across sessions by storing in file
if has('persistent_undo')
  if !isdirectory($HOME.'/.config/nvim/backups')
    silent !mkdir ~/.config/nvim/backups > /dev/null 2>&1
  endif

  set undodir=~/.config/nvim/backups
  set undofile
endif

"
" Completion
"
set wildmode=longest,list,full
set wildmenu
set wildignore=*.o,*.obj,*~
set wildignore+=*vim/backups*
set wildignore+=*sass-cache*
set wildignore+=*DS_Store*
set wildignore+=vendor/bundle/**
set wildignore+=vendor/cache/**
set wildignore+=*.gem
set wildignore+=log/**
set wildignore+=node_modules/**
set wildignore+=tmp/**
set wildignore+=*.png,*.jpg,*.gif
set wildignore+=*.class,*.jar
set wildignore+=*.pdf

"
" Plugins
"
" Load all plugins specified in ~/.config/nvim/plugs.vim
if !filereadable(expand("~/.config/nvim/autoload/plug.vim"))
  silent !mkdir -p ~/.config/nvim/autoload
  silent !curl -fLo ~/.config/nvim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
endif

if filereadable(expand("~/.config/nvim/plugs.vim"))
  source ~/.config/nvim/plugs.vim
endif

"
" Custom Settings
"
source ~/.config/nvim/settings.vim
