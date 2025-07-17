function syncfish --description "Symlink all fish dotfiles to config"
    set -l dotfiles_dir ~/Projects/dotfiles/fish
    set -l config_dir ~/.config/fish
    
    # Create directories if they don't exist
    mkdir -p $config_dir/functions
    mkdir -p $config_dir/conf.d
    mkdir -p $config_dir/completions
    
    # Symlink functions
    echo "Symlinking functions..."
    for f in $dotfiles_dir/functions/*.fish
        set -l basename (basename $f)
        ln -sf $f $config_dir/functions/$basename
        echo "  → $basename"
    end
    
    # Symlink conf.d files
    if test -d $dotfiles_dir/conf.d
        echo "Symlinking conf.d files..."
        for f in $dotfiles_dir/conf.d/*.fish
            set -l basename (basename $f)
            ln -sf $f $config_dir/conf.d/$basename
            echo "  → $basename"
        end
    end
    
    # Symlink completions if they exist
    if test -d $dotfiles_dir/completions
        echo "Symlinking completions..."
        for f in $dotfiles_dir/completions/*.fish
            set -l basename (basename $f)
            ln -sf $f $config_dir/completions/$basename
            echo "  → $basename"
        end
    end
    
    # Symlink config.fish if it exists
    if test -f $dotfiles_dir/config.fish
        echo "Symlinking config.fish..."
        ln -sf $dotfiles_dir/config.fish $config_dir/config.fish
        echo "  → config.fish"
    end
    
    echo "Fish dotfiles synced successfully!"
end