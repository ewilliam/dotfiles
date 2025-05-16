function brewu
	echo "🔄 Updating Homebrew..."
	brew update
	echo "✅ Homebrew updated successfully!"
	echo ""

	echo "🚀 Upgrading Formulae..."
	brew upgrade
	echo "📦 Upgrading Casks..."
	brew upgrade --cask
	echo "🧹 Cleaning up..."
	brew cleanup
	echo "🩺 Running diagnostics..."
	brew doctor
	echo ""

	echo "🎉 Homebrew updates completed!"
	echo ""
end
