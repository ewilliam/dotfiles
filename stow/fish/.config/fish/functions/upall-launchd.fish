function upall-launchd -d "Run upall non-interactively for launchd, logging to file"
    set -l logdir ~/Library/Logs
    set -l logfile $logdir/upall.log

    # Ensure PATH includes Homebrew
    fish_add_path -gP /opt/homebrew/bin /opt/homebrew/sbin

    echo "===== upall started: "(date "+%Y-%m-%d %H:%M:%S")" =====" >>$logfile
    upall 2>&1 | string replace -ra '\e\[[^m]*m' '' >>$logfile
    echo "===== upall finished: "(date "+%Y-%m-%d %H:%M:%S")" =====" >>$logfile
    echo "" >>$logfile
end
