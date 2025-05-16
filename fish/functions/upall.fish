function upall
    echo "🚀 Starting system updates..."
    echo ""

    brewu
    pnpmu
    miseu

    echo "🛍️ Running Mac App Store upgrades..."
    mas upgrade
    echo "✅ Mac App Store upgrades completed."
    echo ""

    echo "🐟 Updating Fisher packages..."
    fisher update
    echo "✅ Fisher updates completed."
    echo ""

    echo "🎉🎉🎉 All system updates completed. 🎉🎉🎉"
    echo ""
end
