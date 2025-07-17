# Fish abbreviations converted from bash aliases

# Directory navigation
abbr -a -- .. 'cd ..'
abbr -a -- ... 'cd ../../'
abbr -a -- .... 'cd ../../../'
abbr -a -- ..... 'cd ../../../../'

# System commands
abbr -a -- cl clear
abbr -a -- df 'df -h'
abbr -a -- du 'du -sh'
abbr -a -- l 'ls -alhG'
abbr -a -- lg 'ls -alhG | grep -i'
abbr -a -- tlf 'tail -f'
abbr -a -- psg 'ps aux | grep'
abbr -a -- psp 'ps aux | peco'
abbr -a -- k9 'kill -9'
abbr -a -- ka9 'killall -9'

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
abbr -a -- brewu 'brew update && brew upgrade && brew cleanup && brew doctor'
abbr -a -- gemu 'gem update --system && gem update'
abbr -a -- pipu 'pip freeze --local | grep -v "^\-e" | cut -d = -f 1 | xargs pip install -U 2>/dev/null || true'
abbr -a -- pip2u 'pip2 freeze --local | grep -v "^\-e" | cut -d = -f 1 | xargs pip2 install -U 2>/dev/null || true'
abbr -a -- pip3u 'pip3 freeze --local | grep -v "^\-e" | cut -d = -f 1 | xargs pip3 install -U 2>/dev/null || true'

# Tmux
abbr -a -- muxn 'tmux new-session -s'
abbr -a -- muxl 'tmux list-sessions'
abbr -a -- muxa 'tmux attach-session'

# Applications
abbr -a -- vi nvim
abbr -a -- ve 'nvim ~/.config/nvim/init.vim'
abbr -a -- emacs 'echo lmao'
abbr -a -- mail neomutt
abbr -a -- music pianobar
abbr -a -- news newsboat

# Fish specific
abbr -a -- frl 'source ~/.config/fish/config.fish'

# System specific (Mac)
abbr -a -- showFiles 'defaults write com.apple.finder AppleShowAllFiles TRUE && killall Finder'
abbr -a -- hideFiles 'defaults write com.apple.finder AppleShowAllFiles FALSE && killall Finder'
abbr -a -- flushdns 'sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder'
