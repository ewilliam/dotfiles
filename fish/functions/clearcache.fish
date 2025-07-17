function clearcache -d "Clear various caches on macOS"
    echo "Clearing macOS caches..."
    
    # Clear user cache
    if test -d ~/Library/Caches
        echo "Clearing user caches..."
        sudo rm -rf ~/Library/Caches/*
    end
    
    # Clear system cache
    echo "Clearing system caches..."
    sudo rm -rf /Library/Caches/*
    sudo rm -rf /System/Library/Caches/*
    
    # Clear DNS cache
    echo "Flushing DNS cache..."
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder
    
    # Clear font cache
    echo "Clearing font cache..."
    sudo atsutil databases -remove
    
    # Clear icon cache
    echo "Clearing icon cache..."
    sudo rm -rf /Library/Caches/com.apple.iconservices.store
    
    # Purge memory
    echo "Purging inactive memory..."
    sudo purge
    
    echo "Cache clearing complete!"
end