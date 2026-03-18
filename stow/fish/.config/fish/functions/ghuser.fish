function ghuser -d "Switch between GitHub users"
    switch $argv[1]
        case ewilliam
            git config --global user.name "William Albright"
            git config --global user.email "ping@ewilli.am"
            git config --global github.user "ewilliam"
            gh auth switch --user ewilliam
        case ewilliam-csd
            git config --global user.name "William Albright"
            git config --global user.email "walbright@csd.org"
            git config --global github.user "ewilliam-csd"
            gh auth switch --user ewilliam-csd
        case '*'
            echo "Current user: "(git config --global github.user)" <"(git config --global user.email)">"
            echo ""
            echo "Usage: ghuser [ewilliam|ewilliam-csd]"
    end
end
