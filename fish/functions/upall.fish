function upall
    echo "🚀 Starting system updates..."
    echo ""

    echo "🍺 Homebrew..."
    brew update && brew upgrade && brew upgrade --cask && brew cleanup && brew doctor
    echo ""

    echo "📦 pnpm..."
    corepack prepare pnpm@latest --activate && pnpm update -g
    echo ""

    echo "🔧 mise..."
    mise plugins update && mise upgrade
    echo ""

    echo "🛍️ Mac App Store..."
    mas upgrade
    echo ""

    echo "🐟 Fisher..."
    fisher update
    echo ""

    echo "✅ All updates completed!"
end
