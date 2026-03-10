function clearcache -d "Clear macOS caches (use --browsers-only for just browser caches)"
    argparse 'browsers-only' -- $argv
    or return 1

    # --- Browser caches (always included) ---
    echo "Clearing browser caches..."
    set -l found_any 0
    set -l browsers \
        "Chrome:Google/Chrome" \
        "Firefox:Firefox" \
        "Safari:com.apple.Safari" \
        "Edge:com.microsoft.edgemac" \

    for entry in $browsers
        set -l name (string split ":" $entry)[1]
        set -l cache_path (string split ":" $entry)[2]
        if test -d ~/Library/Caches/$cache_path
            echo "  Clearing $name cache..."
            command rm -rf ~/Library/Caches/$cache_path/
            set found_any 1
        end
    end

    if test $found_any -eq 0
        echo "  No browser caches found."
    end

    if set -q _flag_browsers_only
        echo "Browser cache clearing complete!"
        return 0
    end

    # --- Full system cache clearing requires confirmation ---
    echo ""
    echo "This will clear all user/system caches, flush DNS, and purge memory."
    read -P "Continue? [y/N] " confirm
    if not string match -qi 'y' $confirm
        echo "Aborted."
        return 1
    end

    # Clear user cache
    if test -d ~/Library/Caches
        echo "Clearing user caches..."
        sudo /bin/rm -rf ~/Library/Caches/*
    end

    # Clear system cache
    if test -d /Library/Caches
        echo "Clearing system caches..."
        sudo /bin/rm -rf /Library/Caches/*
    end

    # Clear DNS cache
    echo "Flushing DNS cache..."
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder

    # Clear font cache (if atsutil is available)
    if command -q atsutil
        echo "Clearing font cache..."
        sudo atsutil databases -remove
    end

    # Clear icon cache
    if test -e /Library/Caches/com.apple.iconservices.store
        echo "Clearing icon cache..."
        sudo /bin/rm -rf /Library/Caches/com.apple.iconservices.store
    end

    # Purge inactive memory
    echo "Purging inactive memory (may cause temporary slowdown)..."
    sudo purge

    echo "Cache clearing complete!"
end
