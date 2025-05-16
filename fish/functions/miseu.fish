function miseu
    echo "🔌 Updating mise plugin definitions..."
    mise plugins update
    echo "✅ mise plugin definitions updated."
    echo ""

    echo "⬆️  Upgrading mise tools..."
    mise upgrade
    echo "✅ mise tools updated."
    echo "🎉 All mise updates completed!"
    echo ""
end
