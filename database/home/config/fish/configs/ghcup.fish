set -gx GHCUP_INSTALL_BASE_PREFIX "$HOME/.local/opt"
set -gx GHCUP_INSTALL "$GHCUP_INSTALL_BASE_PREFIX/.ghcup"
fish_add_path -m "$GHCUP_INSTALL/bin"
