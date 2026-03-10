function syncfish -d "Symlink all fish dotfiles to config"
    if not set -q PROJECT_HOME
        echo "PROJECT_HOME is not set" >&2
        return 1
    end

    set -l dotfiles_dir $PROJECT_HOME/dotfiles/fish
    set -l config_dir ~/.config/fish

    if not test -d $dotfiles_dir
        echo "Dotfiles directory not found: $dotfiles_dir" >&2
        return 1
    end

    # Create target directories
    mkdir -p $config_dir/{functions,conf.d,completions}

    # Symlink functions, conf.d, and completions
    for dir in functions conf.d completions
        if not test -d $dotfiles_dir/$dir
            continue
        end

        echo "Symlinking $dir..."

        # Clean stale symlinks
        for link in $config_dir/$dir/*.fish
            if test -L $link; and not test -e $link
                set -l stale_name (basename $link)
                echo "  Removing stale link: $stale_name"
                command rm $link
            end
        end

        # Create new symlinks
        for f in $dotfiles_dir/$dir/*.fish
            set -l fname (basename $f)
            ln -sf $f $config_dir/$dir/$fname
            echo "  -> $fname"
        end
    end

    # Symlink individual files
    for file in config.fish fish_plugins
        if test -f $dotfiles_dir/$file
            echo "Symlinking $file..."
            ln -sf $dotfiles_dir/$file $config_dir/$file
            echo "  -> $file"
        end
    end

    echo "Fish dotfiles synced successfully!"
end
