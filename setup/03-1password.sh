#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "1Password"

# ── 1. Check CLI is available ────────────────────────────────────────
if ! is_installed op; then
    warn "1Password CLI not found — skipping (run brew bundle first)"
    return 0 2>/dev/null || exit 0
fi

# ── 2. Sign in ───────────────────────────────────────────────────────
# op signin is a no-op when already authenticated; it will prompt
# interactively on a fresh machine.  The --raw flag suppresses the
# session token from appearing in shell history/output.
if op account list --format=json 2>/dev/null | grep -q '"email"'; then
    success "1Password account already configured"
else
    info "Opening 1Password sign-in (follow the prompts in your browser)…"
    if op account add --signin; then
        success "Signed in to 1Password"
    else
        warn "1Password sign-in skipped or failed — SSH agent won't work until you sign in"
        warn "Run: op account add --signin"
    fi
fi

# ── 3. SSH agent integration ─────────────────────────────────────────
OP_AGENT_SOCK="$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"

if [[ -S "$OP_AGENT_SOCK" ]]; then
    success "1Password SSH agent socket present"
else
    warn "1Password SSH agent socket not found at:"
    warn "  $OP_AGENT_SOCK"
    warn "Enable it in 1Password → Settings → Developer → Use the SSH agent"
    warn "Your ~/.ssh/config already points to this socket — it will work once enabled."
fi

# ── 4. SSH config permissions ────────────────────────────────────────
# stow writes ~/.ssh/config as a symlink; SSH requires the real dir to be 700.
if [[ -d "$HOME/.ssh" ]]; then
    chmod 700 "$HOME/.ssh"

    # config may be a symlink — chmod the target if so
    config_target="$(realpath "$HOME/.ssh/config" 2>/dev/null || true)"
    if [[ -f "$config_target" ]]; then
        chmod 600 "$config_target"
        success "SSH config permissions set (700 dir, 600 config)"
    fi
fi

# ── 5. Remind about GUI app ──────────────────────────────────────────
if [[ ! -d "/Applications/1Password.app" ]]; then
    warn "1Password.app not found — open it and enable SSH agent in its settings"
fi
