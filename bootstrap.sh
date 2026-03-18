#!/usr/bin/env bash
#
# Bootstrap a fresh macOS machine or update an existing one.
# Safe to re-run anytime -- every step is idempotent.
#
# Usage: sh bootstrap.sh [computer-name]
#   computer-name  Hostname to set via scutil (default: prompts interactively)
#

set -euo pipefail

DOTFILES="$(cd "$(dirname "$0")" && pwd)"
source "$DOTFILES/setup/lib.sh"

STEP_TOTAL=8
START_TIME=$SECONDS

printf "\n${BOLD}dotfiles bootstrap${RESET}\n"
printf "==================\n"

# Run each step script
source "$DOTFILES/setup/00-xcode.sh"
source "$DOTFILES/setup/01-brew.sh"
source "$DOTFILES/setup/02-stow.sh"
source "$DOTFILES/setup/03-1password.sh"
source "$DOTFILES/setup/04-shell.sh"
source "$DOTFILES/setup/05-tools.sh"
source "$DOTFILES/setup/06-mas.sh"
source "$DOTFILES/setup/07-macos.sh"

elapsed=$(( SECONDS - START_TIME ))
minutes=$(( elapsed / 60 ))
seconds=$(( elapsed % 60 ))

printf "\n${GREEN}${BOLD}Done${RESET} in %dm %ds\n" "$minutes" "$seconds"
printf "${YELLOW}${BOLD}!${RESET} Restart required for all settings to take effect\n\n"
