#!/usr/bin/env bash
# Shared library for bootstrap scripts -- source this, don't execute it.

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
    BOLD="\033[1m"
    DIM="\033[2m"
    RED="\033[31m"
    GREEN="\033[32m"
    YELLOW="\033[33m"
    BLUE="\033[34m"
    RESET="\033[0m"
else
    BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

# ── Logging ─────────────────────────────────────────────────────────
info()    { printf "      ${DIM}%s${RESET}\n" "$*"; }
success() { printf "      ${GREEN}+${RESET} %s\n" "$*"; }
warn()    { printf "      ${YELLOW}!${RESET} %s\n" "$*"; }
error()   { printf "      ${RED}x${RESET} %s\n" "$*" >&2; }

# ── Step header ─────────────────────────────────────────────────────
STEP_CURRENT=${STEP_CURRENT:-0}
STEP_TOTAL=${STEP_TOTAL:-0}

step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    printf "\n${BOLD}[%d/%d] %s${RESET}\n" "$STEP_CURRENT" "$STEP_TOTAL" "$1"
}

# ── Spinner ─────────────────────────────────────────────────────────
# Usage: spin "message" command arg1 arg2 ...
spin() {
    local msg="$1"; shift
    local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    local logfile
    logfile=$(mktemp)

    "$@" > "$logfile" 2>&1 &
    local pid=$!
    local i=0

    while kill -0 "$pid" 2>/dev/null; do
        printf "\r      ${BLUE}%s${RESET} %s" "${frames[$((i % ${#frames[@]}))]}" "$msg"
        i=$((i + 1))
        sleep 0.08
    done

    wait "$pid"
    local exit_code=$?

    printf "\r\033[K"  # clear spinner line

    if [[ $exit_code -eq 0 ]]; then
        success "$msg"
    else
        error "$msg"
        printf "${DIM}"
        cat "$logfile" >&2
        printf "${RESET}"
    fi

    rm -f "$logfile"
    return $exit_code
}

# ── Utilities ───────────────────────────────────────────────────────
is_installed() { command -v "$1" &>/dev/null; }

# Path to the dotfiles repo (parent of setup/)
DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
