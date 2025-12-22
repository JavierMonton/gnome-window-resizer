/**
 * GNOME Window Resizer Extension
 * 
 * Allows users to resize the focused window to predefined sizes
 * using keyboard shortcuts. Supports cycling through sizes and
 * direct shortcuts for each size.
 */

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class WindowResizerExtension extends Extension {
    // Track current size index per window (using window's stable_sequence)
    _windowSizeIndex = new Map();
    
    // Store keybinding action names for cleanup
    _keybindingActions = [];
    
    enable() {
        this._settings = this.getSettings();
        
        // Connect to settings changes
        this._settingsChangedId = this._settings.connect('changed::size-presets', () => {
            this._onSizesChanged();
        });
        
        // Register all keybindings
        this._registerKeybindings();
        
        console.log('[Window Resizer] Extension enabled');
    }

    disable() {
        // Disconnect settings signal
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        // Remove all keybindings
        this._unregisterKeybindings();
        
        // Clear state
        this._windowSizeIndex.clear();
        this._settings = null;
        
        console.log('[Window Resizer] Extension disabled');
    }

    _registerKeybindings() {
        const mode = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;
        
        // Cycle forward (next)
        Main.wm.addKeybinding(
            'cycle-next',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            mode,
            () => this._cycleSize(1)
        );
        this._keybindingActions.push('cycle-next');
        
        // Cycle backward (previous)
        Main.wm.addKeybinding(
            'cycle-previous',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            mode,
            () => this._cycleSize(-1)
        );
        this._keybindingActions.push('cycle-previous');
        
        // Direct size shortcuts (1-9)
        for (let i = 1; i <= 9; i++) {
            const keyName = `size-${i}`;
            Main.wm.addKeybinding(
                keyName,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                mode,
                () => this._resizeToIndex(i - 1)
            );
            this._keybindingActions.push(keyName);
        }
    }

    _unregisterKeybindings() {
        for (const action of this._keybindingActions) {
            Main.wm.removeKeybinding(action);
        }
        this._keybindingActions = [];
    }

    /**
     * Get the predefined sizes from settings
     * @returns {Array<{width: number, height: number}>}
     */
    _getSizes() {
        const sizeStrings = this._settings.get_strv('size-presets');
        const sizes = [];
        
        for (const str of sizeStrings) {
            const match = str.match(/^(\d+)x(\d+)$/);
            if (match) {
                sizes.push({
                    width: parseInt(match[1], 10),
                    height: parseInt(match[2], 10)
                });
            }
        }
        
        return sizes;
    }

    /**
     * Get the currently focused window
     * @returns {Meta.Window|null}
     */
    _getFocusedWindow() {
        const window = global.display.focus_window;
        
        if (!window) {
            return null;
        }
        
        // Only resize normal windows (not dialogs, menus, etc.)
        if (window.get_window_type() !== Meta.WindowType.NORMAL) {
            return null;
        }
        
        return window;
    }

    /**
     * Get a stable identifier for a window
     * @param {Meta.Window} window
     * @returns {number}
     */
    _getWindowId(window) {
        return window.get_stable_sequence();
    }

    /**
     * Cycle through sizes (forward or backward)
     * @param {number} direction - 1 for forward, -1 for backward
     */
    _cycleSize(direction) {
        const window = this._getFocusedWindow();
        if (!window) {
            this._showNotification('No window focused');
            return;
        }
        
        const sizes = this._getSizes();
        if (sizes.length === 0) {
            this._showNotification('No sizes configured');
            return;
        }
        
        const windowId = this._getWindowId(window);
        let currentIndex = this._windowSizeIndex.get(windowId) ?? -1;
        
        // Calculate next index with wrapping
        currentIndex = currentIndex + direction;
        if (currentIndex >= sizes.length) {
            currentIndex = 0;
        } else if (currentIndex < 0) {
            currentIndex = sizes.length - 1;
        }
        
        // Store the new index
        this._windowSizeIndex.set(windowId, currentIndex);
        
        // Apply the size
        this._applySize(window, sizes[currentIndex]);
    }

    /**
     * Resize to a specific size index (0-based)
     * @param {number} index
     */
    _resizeToIndex(index) {
        const window = this._getFocusedWindow();
        if (!window) {
            this._showNotification('No window focused');
            return;
        }
        
        const sizes = this._getSizes();
        if (index >= sizes.length) {
            this._showNotification(`Size ${index + 1} not configured`);
            return;
        }
        
        const windowId = this._getWindowId(window);
        this._windowSizeIndex.set(windowId, index);
        
        this._applySize(window, sizes[index]);
    }

    /**
     * Apply a size to a window
     * @param {Meta.Window} window
     * @param {{width: number, height: number}} size
     */
    _applySize(window, size) {
        // Unmaximize if maximized
        if (window.get_maximized()) {
            window.unmaximize(Meta.MaximizeFlags.BOTH);
        }
        
        // Get current position to keep the window in place
        const rect = window.get_frame_rect();
        
        // Resize the window (keep current position)
        window.move_resize_frame(
            false, // user_op
            rect.x,
            rect.y,
            size.width,
            size.height
        );
        
        console.log(`[Window Resizer] Resized to ${size.width}x${size.height}`);
    }

    /**
     * Show a notification to the user
     * @param {string} message
     */
    _showNotification(message) {
        Main.notify('Window Resizer', message);
    }

    /**
     * Handle changes to the sizes setting
     */
    _onSizesChanged() {
        // Clear cached indices when sizes change
        this._windowSizeIndex.clear();
        console.log('[Window Resizer] Sizes changed, cache cleared');
    }
}
