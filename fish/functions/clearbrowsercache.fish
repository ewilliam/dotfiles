function clearbrowsercache -d "Clear browser caches on macOS"
    echo "Clearing browser caches..."
    
    # Chrome
    if test -d ~/Library/Caches/Google/Chrome
        echo "Clearing Chrome cache..."
        rm -rf ~/Library/Caches/Google/Chrome/
    end
    
    # Firefox
    if test -d ~/Library/Caches/Firefox
        echo "Clearing Firefox cache..."
        rm -rf ~/Library/Caches/Firefox/
    end
    
    # Safari
    if test -d ~/Library/Caches/com.apple.Safari
        echo "Clearing Safari cache..."
        rm -rf ~/Library/Caches/com.apple.Safari/
    end
    
    # Edge
    if test -d ~/Library/Caches/com.microsoft.edgemac
        echo "Clearing Edge cache..."
        rm -rf ~/Library/Caches/com.microsoft.edgemac/
    end
    
    # Brave
    if test -d ~/Library/Caches/BraveSoftware/Brave-Browser
        echo "Clearing Brave cache..."
        rm -rf ~/Library/Caches/BraveSoftware/Brave-Browser/
    end
    
    # Arc
    if test -d ~/Library/Caches/company.thebrowser.Browser
        echo "Clearing Arc cache..."
        rm -rf ~/Library/Caches/company.thebrowser.Browser/
    end
    
    echo "Browser cache clearing complete!"
end