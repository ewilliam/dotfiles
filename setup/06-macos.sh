#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "macOS Defaults"

if [[ "$(uname)" != "Darwin" ]]; then
    info "Skipping (not macOS)"
    return 0 2>/dev/null || exit 0
fi

COMPUTER_NAME="${1:-ewa-mbp}"

info "Computer name: $COMPUTER_NAME"

# ── System ──────────────────────────────────────────────────────────
sudo scutil --set ComputerName "$COMPUTER_NAME"
sudo scutil --set HostName "$COMPUTER_NAME"
sudo scutil --set LocalHostName "$COMPUTER_NAME"
sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.smb.server NetBIOSName -string "$COMPUTER_NAME"
sudo systemsetup -settimezone "America/Los_Angeles" > /dev/null
sudo systemsetup -setrestartfreeze on
defaults write com.apple.SoftwareUpdate ScheduleFrequency -int 1

# ── General UI/UX ──────────────────────────────────────────────────
defaults write NSGlobalDomain NSTableViewDefaultSizeMode -int 1
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false
defaults write com.apple.print.PrintingPrefs "Quit When Finished" -bool true
defaults write com.apple.LaunchServices LSQuarantine -bool false
sudo defaults write /Library/Preferences/com.apple.loginwindow AdminHostInfo HostName
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# ── SSD ─────────────────────────────────────────────────────────────
sudo pmset -a hibernatemode 0

# ── Screen ──────────────────────────────────────────────────────────
defaults write com.apple.screencapture disable-shadow -bool true
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0

# ── Keyboard ────────────────────────────────────────────────────────
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 15

# ── Finder ──────────────────────────────────────────────────────────
defaults write com.apple.finder NewWindowTarget -string "PfHm"
defaults write com.apple.finder NewWindowTargetPath -string "file://${HOME}/"
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool false
defaults write com.apple.finder ShowHardDrivesOnDesktop -bool false
defaults write com.apple.finder ShowMountedServersOnDesktop -bool false
defaults write com.apple.finder ShowRemovableMediaOnDesktop -bool false
defaults write NSGlobalDomain AppleShowAllExtensions -bool true
defaults write com.apple.finder ShowStatusBar -bool true
defaults write com.apple.finder ShowPathbar -bool true
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true
defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false
defaults write com.apple.finder FXEnableRemoveFromICloudDriveWarning -bool false
defaults write NSGlobalDomain com.apple.springing.enabled -bool true
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true
defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true

FINDER_PLIST=~/Library/Preferences/com.apple.finder.plist
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:showItemInfo bool true" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:showItemInfo true" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :DesktopViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :DesktopViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :FK_StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :FK_StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"
/usr/libexec/PlistBuddy -c "Add :StandardViewSettings:IconViewSettings:arrangeBy string grid" "$FINDER_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :StandardViewSettings:IconViewSettings:arrangeBy grid" "$FINDER_PLIST"

defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
defaults write com.apple.finder WarnOnEmptyTrash -bool false
chflags nohidden ~/Library
chflags nohidden /Users
sudo chflags nohidden /Volumes
defaults write com.apple.finder FXInfoPanesExpanded -dict \
    General -bool true \
    OpenWith -bool true \
    Privileges -bool true

# ── Dock & Hot Corners ──────────────────────────────────────────────
defaults write com.apple.dock tilesize -int 54
defaults write com.apple.dock magnification -bool false
defaults write com.apple.dock mineffect -string "scale"
defaults write com.apple.dock minimize-to-application -bool true
defaults write com.apple.dock expose-animation-duration -float 0.2
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock autohide-time-modifier -float 0.5
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock show-process-indicators -bool false
defaults write com.apple.dock persistent-apps -array
defaults write com.apple.dock showhidden -bool true

defaults write com.apple.dock wvous-tl-corner -int 2
defaults write com.apple.dock wvous-tl-modifier -int 0
defaults write com.apple.dock wvous-tr-corner -int 12
defaults write com.apple.dock wvous-tr-modifier -int 0
defaults write com.apple.dock wvous-bl-corner -int 3
defaults write com.apple.dock wvous-bl-modifier -int 0
defaults write com.apple.dock wvous-br-corner -int 4
defaults write com.apple.dock wvous-br-modifier -int 0

# ── Terminal ────────────────────────────────────────────────────────
defaults write com.apple.terminal StringEncodings -array 4

# ── TextEdit ────────────────────────────────────────────────────────
defaults write com.apple.TextEdit RichText -int 0
defaults write com.apple.TextEdit PlainTextEncoding -int 4
defaults write com.apple.TextEdit PlainTextEncodingForWrite -int 4

# ── Activity Monitor ───────────────────────────────────────────────
defaults write com.apple.ActivityMonitor OpenMainWindow -bool true
defaults write com.apple.ActivityMonitor ShowCategory -int 0
defaults write com.apple.ActivityMonitor SortColumn -string "CPUUsage"
defaults write com.apple.ActivityMonitor SortDirection -int 0
defaults write com.apple.ActivityMonitor UpdatePeriod -int 2
defaults write com.apple.ActivityMonitor DiskGraphType -int 1
defaults write com.apple.ActivityMonitor NetworkGraphType -int 1

# ── Photos ──────────────────────────────────────────────────────────
defaults -currentHost write com.apple.ImageCapture disableHotPlug -bool true

# ── Time Machine ───────────────────────────────────────────────────
defaults write com.apple.TimeMachine DoNotOfferNewDisksForBackup -bool true

# ── Messages ───────────────────────────────────────────────────────
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "automaticQuoteSubstitutionEnabled" -bool false
defaults write com.apple.messageshelper.MessageController SOInputLineSettings -dict-add "continuousSpellCheckingEnabled" -bool false

# ── Restart affected apps ──────────────────────────────────────────
for app in "Dock" "Finder"; do
    killall "${app}" > /dev/null 2>&1 || true
done
sudo killall cfprefsd > /dev/null 2>&1 || true

success "macOS defaults applied"
info "Some changes require logout/restart"
