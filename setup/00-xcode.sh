#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "Xcode Command Line Tools"

if xcode-select -p &>/dev/null; then
    success "Xcode CLT installed"
else
    info "Installing Xcode Command Line Tools..."
    xcode-select --install 2>/dev/null

    # Wait for the GUI installer to finish
    until xcode-select -p &>/dev/null; do
        sleep 5
    done

    success "Xcode CLT installed"
fi
