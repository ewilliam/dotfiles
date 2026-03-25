#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Xcode Command Line Tools"

if xcode-select -p &>/dev/null; then
    success "Xcode CLT installed"
else
    info "Installing Xcode Command Line Tools..."
    xcode-select --install 2>/dev/null

    # Wait for the GUI installer to finish (timeout after 10 minutes)
    local attempts=0
    until xcode-select -p &>/dev/null; do
        sleep 5
        attempts=$((attempts + 1))
        if [[ $attempts -ge 120 ]]; then
            error "Timed out waiting for Xcode CLT install"
            return 1 2>/dev/null || exit 1
        fi
    done

    success "Xcode CLT installed"
fi
