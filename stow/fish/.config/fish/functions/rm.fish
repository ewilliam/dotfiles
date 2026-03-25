function rm -d "Prevent accidental rm usage; use trash instead"
    if contains -- --force $argv; or contains -- -f $argv; or string match -qr -- '-[a-zA-Z]*f' $argv
        command rm $argv
        return $status
    end
    echo "Use 'trash' instead of 'rm'. Pass --force or -f to bypass." >&2
    return 1
end
