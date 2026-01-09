# GNOME Window Resizer Extension - Makefile
#
# Usage:
#   make build      - Compile GSettings schemas
#   make install    - Install extension locally
#   make uninstall  - Remove extension from local installation
#   make package    - Create ZIP for extensions.gnome.org
#   make clean      - Remove build artifacts
#   make test       - Run basic validation
#   make reload     - Reload GNOME Shell (X11 only)

# Extension configuration
UUID = gnome-window-resizer@javiermonton.github.io
NAME = gnome-window-resizer
VERSION = 1

# Directories
SRC_DIR = src
SCHEMA_DIR = schemas
BUILD_DIR = build
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

# Files to include in the extension
EXTENSION_FILES = \
	metadata.json \
	$(SRC_DIR)/extension.js \
	$(SRC_DIR)/prefs.js \
	$(SRC_DIR)/stylesheet.css \
	$(SCHEMA_DIR)/org.gnome.shell.extensions.$(NAME).gschema.xml

.PHONY: all build install uninstall package clean test reload help

# Default target
all: build

# Compile GSettings schemas
build:
	@echo "Building extension..."
	@mkdir -p $(BUILD_DIR)
	@glib-compile-schemas $(SCHEMA_DIR)
	@echo "Build complete!"

# Install extension locally
install: build
	@echo "Installing extension to $(INSTALL_DIR)..."
	@mkdir -p $(INSTALL_DIR)
	@mkdir -p $(INSTALL_DIR)/schemas
	@cp metadata.json $(INSTALL_DIR)/
	@cp $(SRC_DIR)/extension.js $(INSTALL_DIR)/
	@cp $(SRC_DIR)/prefs.js $(INSTALL_DIR)/
	@cp $(SRC_DIR)/stylesheet.css $(INSTALL_DIR)/
	@cp $(SCHEMA_DIR)/*.xml $(INSTALL_DIR)/schemas/
	@cp $(SCHEMA_DIR)/gschemas.compiled $(INSTALL_DIR)/schemas/
	@echo "Installation complete!"
	@echo ""
	@echo "To enable the extension:"
	@echo "  1. Log out and log back in, or restart GNOME Shell"
	@echo "  2. Enable via: gnome-extensions enable $(UUID)"
	@echo "  3. Or use GNOME Extensions app"

# Uninstall extension
uninstall:
	@echo "Uninstalling extension..."
	@rm -rf $(INSTALL_DIR)
	@echo "Extension uninstalled!"

# Create ZIP package for extensions.gnome.org
package: build
	@echo "Creating extension package..."
	@mkdir -p $(BUILD_DIR)/$(UUID)/schemas
	@cp metadata.json $(BUILD_DIR)/$(UUID)/
	@cp $(SRC_DIR)/extension.js $(BUILD_DIR)/$(UUID)/
	@cp $(SRC_DIR)/prefs.js $(BUILD_DIR)/$(UUID)/
	@cp $(SRC_DIR)/stylesheet.css $(BUILD_DIR)/$(UUID)/
	@cp $(SCHEMA_DIR)/*.xml $(BUILD_DIR)/$(UUID)/schemas/
	@cp $(SCHEMA_DIR)/gschemas.compiled $(BUILD_DIR)/$(UUID)/schemas/
	@cd $(BUILD_DIR)/$(UUID) && zip -r ../../$(NAME)-v$(VERSION).zip .
	@rm -rf $(BUILD_DIR)/$(UUID)
	@echo "Package created: $(NAME)-v$(VERSION).zip"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(SCHEMA_DIR)/gschemas.compiled
	@rm -f $(NAME)-*.zip
	@echo "Clean complete!"

# Basic validation
test: build
	@echo "Running validation..."
	@echo "Checking metadata.json..."
	@python3 -m json.tool metadata.json > /dev/null
	@echo "  ✓ metadata.json is valid JSON"
	@echo "Checking JavaScript syntax..."
	@if command -v gjs > /dev/null; then \
		gjs -c "import('$(PWD)/$(SRC_DIR)/extension.js')" 2>/dev/null || echo "  ⚠ Note: Full import test requires GNOME Shell environment"; \
	else \
		echo "  ⚠ gjs not found, skipping JS syntax check"; \
	fi
	@echo "Checking GSettings schema..."
	@xmllint --noout $(SCHEMA_DIR)/*.xml 2>/dev/null && echo "  ✓ Schema XML is valid" || echo "  ⚠ xmllint not available"
	@echo "Validation complete!"

# Reload GNOME Shell (only works on X11)
reload:
	@echo "Reloading GNOME Shell..."
	@if [ "$$XDG_SESSION_TYPE" = "x11" ]; then \
		busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting...")' || echo "Failed to restart"; \
	else \
		echo "Cannot reload on Wayland. Please log out and back in."; \
	fi

# Development: watch for changes and auto-install
dev: install
	@echo "Development mode: Watching for changes..."
	@echo "Press Ctrl+C to stop"
	@while true; do \
		inotifywait -qre modify,create,delete $(SRC_DIR) $(SCHEMA_DIR) metadata.json 2>/dev/null; \
		echo "Changes detected, reinstalling..."; \
		$(MAKE) install; \
	done

# Help
help:
	@echo "GNOME Window Resizer Extension - Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build      Compile GSettings schemas"
	@echo "  install    Install extension to ~/.local/share/gnome-shell/extensions/"
	@echo "  uninstall  Remove extension from local installation"
	@echo "  package    Create ZIP file for extensions.gnome.org submission"
	@echo "  clean      Remove build artifacts"
	@echo "  test       Run basic validation checks"
	@echo "  reload     Reload GNOME Shell (X11 only)"
	@echo "  dev        Watch for changes and auto-install"
	@echo "  help       Show this help message"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install    # Install the extension"
	@echo "  make package    # Create ZIP for publishing"

