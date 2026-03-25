function upall -d "Update all system packages and plugins"
    set -l bold (set_color --bold)
    set -l blue (set_color blue)
    set -l green (set_color green)
    set -l red (set_color red)
    set -l dim (set_color brblack)
    set -l reset (set_color normal)

    set -l passed
    set -l failed
    set -l skipped

    function _upall_header -S
        echo ""
        echo "$bold$blue── $argv[1] ──$reset"
    end

    function _upall_run -S
        set -l label $argv[1]
        set -l cmd $argv[2..]
        printf "  %s ... " "$label"
        if $cmd >/dev/null 2>&1
            echo "$green"ok"$reset"
            return 0
        else
            echo "$red"fail"$reset"
            return 1
        end
    end

    echo ""
    echo "$bold  System Update$reset"
    echo "$dim  "(date "+%Y-%m-%d %H:%M")"$reset"

    # --- Homebrew ---
    if command -q brew
        _upall_header Homebrew
        _upall_run "Updating formulae" brew update
            and set -a passed Homebrew:update
            or set -a failed Homebrew:update
        _upall_run "Upgrading packages" brew upgrade
            and set -a passed Homebrew:upgrade
            or set -a failed Homebrew:upgrade
        _upall_run "Upgrading casks" brew upgrade --cask
            and set -a passed Homebrew:casks
            or set -a failed Homebrew:casks
        _upall_run "Cleaning up" brew cleanup
            and set -a passed Homebrew:cleanup
            or set -a failed Homebrew:cleanup
    else
        set -a skipped Homebrew
    end

    # --- mise ---
    if command -q mise
        _upall_header mise
        _upall_run "Updating plugins" mise plugins update
            and set -a passed mise:plugins
            or set -a failed mise:plugins
        _upall_run "Upgrading tools" mise upgrade
            and set -a passed mise:upgrade
            or set -a failed mise:upgrade
    else
        set -a skipped mise
    end

    # --- Mac App Store ---
    if command -q mas
        _upall_header "Mac App Store"
        _upall_run "Upgrading apps" mas upgrade
            and set -a passed mas:upgrade
            or set -a failed mas:upgrade
    else
        set -a skipped mas
    end

    # --- Fisher ---
    if functions -q fisher
        _upall_header Fisher
        _upall_run "Updating plugins" fisher update
            and set -a passed fisher:update
            or set -a failed fisher:update
    else
        set -a skipped fisher
    end

    # --- Summary ---
    echo ""
    echo "$bold$blue── Summary ──$reset"

    set -l pass_count (count $passed)
    set -l fail_count (count $failed)
    set -l skip_count (count $skipped)

    echo "  $green$pass_count passed$reset  $red$fail_count failed$reset  $dim$skip_count skipped$reset"

    if test $fail_count -gt 0
        echo ""
        echo "  $red"Failed:"$reset"
        for f in $failed
            echo "    $dim·$reset $f"
        end
    end

    if test $skip_count -gt 0
        echo ""
        echo "  $dim"Skipped:"$reset"
        for s in $skipped
            echo "    $dim·$reset $s"
        end
    end

    echo ""

    functions -e _upall_header
    functions -e _upall_run

    test $fail_count -eq 0
end
