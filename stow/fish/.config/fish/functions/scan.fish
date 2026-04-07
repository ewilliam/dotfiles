function scan -d "Scan files for malware with ClamAV"
    set -l bold (set_color --bold)
    set -l green (set_color green)
    set -l red (set_color red)
    set -l yellow (set_color yellow)
    set -l dim (set_color brblack)
    set -l reset (set_color normal)

    # Default to ~/Downloads if no path given
    set -l targets $argv
    if test (count $targets) -eq 0
        set targets ~/Downloads
    end

    # Ensure clamav is installed
    if not command -q clamdscan
        echo "$red""error:$reset clamav not installed (brew install clamav)"
        return 1
    end

    # Start clamd if not running
    if not pgrep -x clamd >/dev/null 2>&1
        echo "$dim""Starting clamd...$reset"
        clamd >/dev/null 2>&1 &
        disown

        # Wait for socket to be ready
        set -l retries 30
        while test $retries -gt 0
            if test -S /tmp/clamd.sock
                break
            end
            sleep 0.5
            set retries (math $retries - 1)
        end

        if test $retries -eq 0
            echo "$red""error:$reset clamd failed to start (check /opt/homebrew/var/log/clamd.log)"
            return 1
        end
        echo "$green""clamd ready$reset"
    end

    # Run scan
    echo ""
    echo "$bold""Scanning$reset $dim"(string join ", " $targets)"$reset"
    echo ""

    set -l output (clamdscan --multiscan --fdpass --infected $targets 2>&1)
    set -l exit_code $status

    switch $exit_code
        case 0
            echo "$green$bold""Clean$reset — no threats found"
        case 1
            echo $output | string match -rv '^\$'
            echo ""
            echo "$red$bold""Threats found!$reset"
            echo "$dim""To remove: scan --remove "(string join " " $targets)"$reset"
        case 2
            echo "$red""error:$reset scan failed"
            echo $output
            return 2
    end

    # Show summary line from output
    for line in $output
        if string match -q "*.FOUND*" -- $line
            echo "  $red$line$reset"
        end
        if string match -q "*Infected files*" -- $line
            echo "  $dim$line$reset"
        end
    end

    echo ""
    return $exit_code
end
