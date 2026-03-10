# Fish abbreviations converted from bash aliases

# Directory navigation
abbr -a -- .. 'cd ..'
abbr -a -- ... 'cd ../../'
abbr -a -- .... 'cd ../../../'
abbr -a -- ..... 'cd ../../../../'

# System commands
abbr -a -- cl clear
abbr -a -- df 'df -h'
abbr -a -- du dust
abbr -a -- l 'eza -al'
abbr -a -- lg 'eza -al | ug -i'
abbr -a -- tlf 'tail -f'
abbr -a -- psg 'ps aux | ug -i'
abbr -a -- psp 'ps aux | fzf'
abbr -a -- k9 'kill -9'
abbr -a -- ka9 'killall -9'
abbr -a -- cat bat
abbr -a -- curl curlie
abbr -a -- find fd
abbr -a -- top btop
abbr -a -- help tldr

# System specific (Mac)
abbr -a -- showFiles 'defaults write com.apple.finder AppleShowAllFiles TRUE && killall Finder'
abbr -a -- hideFiles 'defaults write com.apple.finder AppleShowAllFiles FALSE && killall Finder'
abbr -a -- flushdns 'sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder'
abbr -a -- emptyDock 'defaults write com.apple.dock persistent-apps -array; defaults write com.apple.dock persistent-others -array; killall Dock'

# Git commands
abbr -a -- gst 'git status'
abbr -a -- gad 'git add'
abbr -a -- gci 'git commit'
abbr -a -- gcm 'git commit -m'
abbr -a -- gcam 'git commit --amend -m'
abbr -a -- gco 'git checkout'
abbr -a -- gbr 'git branch'
abbr -a -- gme 'git merge'
abbr -a -- grb 'git rebase'
abbr -a -- gdi 'git diff'
abbr -a -- glg 'git log'
abbr -a -- gcl 'git clone'
abbr -a -- gpl 'git pull'
abbr -a -- gps 'git push'
abbr -a -- gpo 'git push origin'
abbr -a -- gph 'git push heroku'
abbr -a -- grs 'git reset'
abbr -a -- grm 'git remote rm'
abbr -a -- gra 'git remote add'

# Ruby/Rails
abbr -a -- be 'bundle exec'
abbr -a -- ber 'bundle exec rake'
abbr -a -- rpry pry-remote
abbr -a -- bpry 'bundle exec pry -r ./config/environment'

# Package managers
abbr -a -- brewu 'brew update && brew upgrade && brew upgrade --cask && brew cleanup && brew doctor'
abbr -a -- pnpmu 'corepack prepare pnpm@latest --activate && pnpm update -g'
abbr -a -- miseu 'mise plugins update && mise upgrade'
abbr -a -- gemu 'gem update --system && gem update'
abbr -a -- pipu 'pip freeze --local | grep -v "^\-e" | cut -d = -f 1 | xargs pip install -U 2>/dev/null || true'

abbr -a -- pip3u 'pip3 freeze --local | grep -v "^\-e" | cut -d = -f 1 | xargs pip3 install -U 2>/dev/null || true'

# pnpm
abbr -a -- pn pnpm
abbr -a -- pni 'pnpm install'
abbr -a -- pna 'pnpm add'
abbr -a -- pnad 'pnpm add -D'
abbr -a -- pnr 'pnpm run'
abbr -a -- pnx 'pnpm dlx'
abbr -a -- pnu 'pnpm update'
abbr -a -- pnrm 'pnpm remove'
abbr -a -- pns 'pnpm start'
abbr -a -- pnt 'pnpm test'
abbr -a -- pnb 'pnpm build'
abbr -a -- pnd 'pnpm dev'

# Tmux
abbr -a -- muxn 'tmux new-session -s'
abbr -a -- muxl 'tmux list-sessions'
abbr -a -- muxa 'tmux attach-session'

# Applications
abbr -a -- vi nvim
abbr -a -- ve 'nvim ~/.config/nvim/init.vim'
abbr -a -- emacs 'echo lmao'
abbr -a -- mail aerc
abbr -a -- music pianobar
abbr -a -- news newsboat
abbr -a -- cc claude
abbr -a -- ccd 'claude --dangerously-skip-permissions'
abbr -a -- ccr 'claude --resume'
abbr -a -- cx codex
abbr -a -- oc opencode
abbr -a -- lzg lazygit
abbr -a -- yt yt-dlp
abbr -a -- hf hyperfine

# Fish specific
abbr -a -- frl 'source ~/.config/fish/config.fish'
