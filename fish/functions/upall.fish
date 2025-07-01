function upall
    set_color ffb6c1; echo "🚀 Starting system updates..."; set_color normal
    echo ""

    brewu
    pnpmu
    miseu

    set_color ffb6c1; echo "🛍️ Updating Mac App Store apps..."; set_color normal
    mas upgrade
    set_color ffb6c1; echo "✅ Mac App Store updates completed."; set_color normal
    echo ""

    set_color ffb6c1; echo "🐟 Updating Fisher packages..."; set_color normal
    fisher update
    set_color ffb6c1; echo "✅ Fisher updates completed."; set_color normal
    echo ""

    set_color ffb6c1; echo "🎉🎉🎉 All updates completed. 🎉🎉🎉"; set_color normal
    echo ""
end
