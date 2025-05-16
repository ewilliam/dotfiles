function pnpmu
    echo "🚀 Preparing pnpm latest version..."
    corepack prepare pnpm@latest --activate
    echo "✅ pnpm prepared successfully!"
    echo ""

    echo "📦 Updating global packages..."
    pnpm update -g
    echo "✅ pnpm global packages updated!"
    echo "🎉 pnpm updates completed!"
    echo ""
end
