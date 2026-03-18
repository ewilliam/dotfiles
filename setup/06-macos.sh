#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "macOS Defaults"

if [[ "$(uname)" != "Darwin" ]]; then
    info "Skipping (not macOS)"
    return 0 2>/dev/null || exit 0
fi

if [[ -n "${1:-}" ]]; then
    COMPUTER_NAME="$1"
else
    printf "Computer name [ewa-mbp]: "
    read -r COMPUTER_NAME
    COMPUTER_NAME="${COMPUTER_NAME:-ewa-mbp}"
fi

info "Computer name: $COMPUTER_NAME"

# ── System ──────────────────────────────────────────────────────────
sudo scutil --set ComputerName "$COMPUTER_NAME"                          # Friendly name shown in System Settings
sudo scutil --set HostName "$COMPUTER_NAME"                              # DNS / fully-qualified hostname
sudo scutil --set LocalHostName "$COMPUTER_NAME"                         # Bonjour (.local) hostname
sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName -string "$COMPUTER_NAME"  # SMB/Windows network name
sudo systemsetup -settimezone "America/Los_Angeles" > /dev/null          # Set timezone to Pacific
sudo systemsetup -setrestartfreeze on                                    # Auto-restart after a system freeze
defaults write com.apple.SoftwareUpdate ScheduleFrequency -int 1         # Check for software updates daily

# ── General UI/UX ──────────────────────────────────────────────────
defaults write NSGlobalDomain NSTableViewDefaultSizeMode -int 1                     # Small sidebar icon size
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true         # Expand save dialogs by default
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true        # Expand save dialogs by default (secondary)
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true             # Expand print dialogs by default
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true            # Expand print dialogs by default (secondary)
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false          # Save to disk (not iCloud) by default
defaults write com.apple.print.PrintingPrefs "Quit When Finished" -bool true        # Auto-quit Printer app when jobs complete
defaults write com.apple.LaunchServices LSQuarantine -bool false                     # Disable "Are you sure you want to open this?" quarantine dialog
sudo defaults write /Library/Preferences/com.apple.loginwindow AdminHostInfo HostName  # Show hostname on the login screen
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false        # Disable smart quotes
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false         # Disable smart dashes
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false       # Disable auto-correct

# ── SSD ─────────────────────────────────────────────────────────────
sudo pmset -a hibernatemode 0  # Disable hibernation (faster sleep/wake, saves SSD write cycles)

# ── Screen ──────────────────────────────────────────────────────────
defaults write com.apple.screencapture disable-shadow -bool true    # Remove drop shadow from screenshots
defaults write com.apple.screensaver askForPassword -int 1          # Require password after screensaver activates
defaults write com.apple.screensaver askForPasswordDelay -int 0     # Require password immediately (no grace period)

# ── Keyboard ────────────────────────────────────────────────────────
defaults write NSGlobalDomain KeyRepeat -int 2           # Fastest key repeat rate (lower = faster)
defaults write NSGlobalDomain InitialKeyRepeat -int 15   # Shortest delay before key repeat starts (lower = shorter)

# ── Finder ──────────────────────────────────────────────────────────
defaults write com.apple.finder NewWindowTarget -string "PfHm"                      # Open new windows at home directory
defaults write com.apple.finder NewWindowTargetPath -string "file://${HOME}/"        # Set home directory path for new windows
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool false          # Hide external drives on desktop
defaults write com.apple.finder ShowHardDrivesOnDesktop -bool false                  # Hide internal drives on desktop
defaults write com.apple.finder ShowMountedServersOnDesktop -bool false              # Hide connected servers on desktop
defaults write com.apple.finder ShowRemovableMediaOnDesktop -bool false              # Hide USB/removable media on desktop
defaults write NSGlobalDomain AppleShowAllExtensions -bool true                      # Always show file extensions
defaults write com.apple.finder ShowStatusBar -bool true                             # Show status bar (item count, disk space)
defaults write com.apple.finder ShowPathbar -bool true                               # Show path breadcrumb bar at bottom
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true                   # Show full POSIX path in title bar
defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"                  # Search the current folder by default
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false            # Don't warn when changing file extensions
defaults write com.apple.finder FXEnableRemoveFromICloudDriveWarning -bool false      # Don't warn when removing from iCloud Drive
defaults write NSGlobalDomain com.apple.springing.enabled -bool true                 # Enable spring-loading for directories (hover to open)
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true          # Don't create .DS_Store on network volumes
defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true              # Don't create .DS_Store on USB volumes

# Show item info below icons in all Finder icon views (desktop, standard, default)
FINDER_PLIST=~/Library/Preferences/com.apple.finder.plist
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"

# Snap-to-grid icon arrangement in all Finder icon views
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"

defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"   # Use list view by default in all windows
defaults write com.apple.finder WarnOnEmptyTrash -bool false           # Don't warn before emptying the Trash
chflags nohidden ~/Library                                             # Unhide ~/Library folder
chflags nohidden /Users                                                # Unhide /Users folder
sudo chflags nohidden /Volumes                                         # Unhide /Volumes folder
defaults write com.apple.finder FXInfoPanesExpanded -dict \
    General -bool true \
    OpenWith -bool true \
    Privileges -bool true                                              # Auto-expand General, Open With, and Privileges in Get Info

# ── Dock & Hot Corners ──────────────────────────────────────────────
defaults write com.apple.dock tilesize -int 54                           # Dock icon size (54 pixels)
defaults write com.apple.dock magnification -bool false                  # Disable Dock magnification on hover
defaults write com.apple.dock mineffect -string "scale"                  # Use "scale" minimize animation (faster than genie)
defaults write com.apple.dock minimize-to-application -bool true         # Minimize windows into their app icon
defaults write com.apple.dock expose-animation-duration -float 0.2       # Speed up Mission Control animation
defaults write com.apple.dock autohide -bool true                        # Auto-hide the Dock
defaults write com.apple.dock autohide-time-modifier -float 0.5          # Dock show/hide animation duration (seconds)
defaults write com.apple.dock autohide-delay -float 0                    # No delay before Dock auto-shows
defaults write com.apple.dock show-process-indicators -bool false         # Hide dots for running applications
defaults write com.apple.dock persistent-apps -array                     # Clear all pinned apps from the Dock
defaults write com.apple.dock showhidden -bool true                      # Make hidden app icons translucent in the Dock

# Hot corners: values — 2=Mission Control, 3=Application Windows, 4=Desktop, 12=Notification Center
defaults write com.apple.dock wvous-tl-corner -int 2       # Top-left corner: Mission Control
defaults write com.apple.dock wvous-tl-modifier -int 0     #   No modifier key required
defaults write com.apple.dock wvous-tr-corner -int 12      # Top-right corner: Notification Center
defaults write com.apple.dock wvous-tr-modifier -int 0     #   No modifier key required
defaults write com.apple.dock wvous-bl-corner -int 3       # Bottom-left corner: Application Windows
defaults write com.apple.dock wvous-bl-modifier -int 0     #   No modifier key required
defaults write com.apple.dock wvous-br-corner -int 4       # Bottom-right corner: Desktop
defaults write com.apple.dock wvous-br-modifier -int 0     #   No modifier key required

# ── Terminal ────────────────────────────────────────────────────────
defaults write com.apple.terminal StringEncodings -array 4   # Set Terminal.app encoding to UTF-8

# ── TextEdit ────────────────────────────────────────────────────────
defaults write com.apple.TextEdit RichText -int 0                      # Default to plain text (not rich text)
defaults write com.apple.TextEdit PlainTextEncoding -int 4             # Open files as UTF-8
defaults write com.apple.TextEdit PlainTextEncodingForWrite -int 4     # Save files as UTF-8

# ── Activity Monitor ───────────────────────────────────────────────
defaults write com.apple.ActivityMonitor OpenMainWindow -bool true      # Show main window on launch
defaults write com.apple.ActivityMonitor ShowCategory -int 0            # Show all processes (not just My Processes)
defaults write com.apple.ActivityMonitor SortColumn -string "CPUUsage"  # Sort by CPU usage by default
defaults write com.apple.ActivityMonitor SortDirection -int 0           # Sort descending (heaviest first)
defaults write com.apple.ActivityMonitor UpdatePeriod -int 2            # Update every 2 seconds
defaults write com.apple.ActivityMonitor DiskGraphType -int 1           # Show data in disk graph (not IO count)
defaults write com.apple.ActivityMonitor NetworkGraphType -int 1        # Show data in network graph (not packets)

# ── Photos ──────────────────────────────────────────────────────────
defaults -currentHost write com.apple.ImageCapture disableHotPlug -bool true  # Don't auto-open Photos when a device is plugged in

# ── Time Machine ───────────────────────────────────────────────────
defaults write com.apple.TimeMachine DoNotOfferNewDisksForBackup -bool true  # Don't prompt to use new disks for Time Machine

# ── Messages ───────────────────────────────────────────────────────
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "automaticQuoteSubstitutionEnabled" -bool false   # Disable smart quotes in Messages
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "continuousSpellCheckingEnabled" -bool false      # Disable spell check in Messages

# ── Restart affected apps ──────────────────────────────────────────
for app in "Dock" "Finder"; do
    killall "${app}" > /dev/null 2>&1 || true   # Restart Dock and Finder to apply changes
done
sudo killall cfprefsd > /dev/null 2>&1 || true  # Flush preferences daemon cache

success "macOS defaults applied"
info "Some changes require logout/restart"
