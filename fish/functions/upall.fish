function upall -d "Update all system packages and plugins"
    echo "Starting system updates..."
    echo ""

    if command -q brew
        echo "Homebrew..."
        brew update
        brew upgrade
        brew upgrade --cask
        brew cleanup
        brew doctor
    else
        echo "brew not found, skipping" >&2
    end
    echo ""

    if command -q corepack; and command -q pnpm
        echo "pnpm..."
        corepack prepare pnpm@latest --activate
        pnpm update -g
    else
        echo "corepack/pnpm not found, skipping" >&2
    end
    echo ""

    if command -q mise
        echo "mise..."
        mise plugins update
        mise upgrade
    else
        echo "mise not found, skipping" >&2
    end
    echo ""

    if command -q gem
        echo "Ruby gems..."
        gem update --system
        gem update
    else
        echo "gem not found, skipping" >&2
    end
    echo ""

    if command -q pip3
        echo "pip3..."
        pip3 freeze --local | grep -v '^\-e' | cut -d = -f 1 | xargs pip3 install -U 2>/dev/null; or true
    else
        echo "pip3 not found, skipping" >&2
    end
    echo ""

    if command -q mas
        echo "Mac App Store..."
        mas upgrade
    else
        echo "mas not found, skipping" >&2
    end
    echo ""

    if command -q fisher
        echo "Fisher..."
        fisher update
    else
        echo "fisher not found, skipping" >&2
    end
    echo ""

    echo "All updates completed!"
end
