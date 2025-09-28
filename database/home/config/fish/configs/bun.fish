set -gx BUN_INSTALL "$HOME/.local/opt/bun"
set -gx BUN_INSTALL_CACHE_DIR "$BUN_INSTALL/install/cache"
fish_add_path -m "$BUN_INSTALL/bin"
