/**
 * GNOME Window Resizer Extension - Preferences
 * 
 * Settings UI for configuring predefined window sizes
 * and keyboard shortcuts.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Custom widget for a single size entry with edit/delete actions
 */
const SizeRow = GObject.registerClass({
    GTypeName: 'WindowResizerSizeRow',
}, class SizeRow extends Adw.ActionRow {
    _init(sizeString, index, onDelete, onEdit) {
        super._init({
            title: `Size ${index + 1}`,
            subtitle: sizeString.replace('x', ' × ') + ' px',
        });

        this._sizeString = sizeString;
        this._index = index;
        this._onDelete = onDelete;
        this._onEdit = onEdit;

        // Edit button
        const editButton = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Edit size',
        });
        editButton.connect('clicked', () => this._onEditClicked());
        this.add_suffix(editButton);

        // Delete button
        const deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat', 'error'],
            tooltip_text: 'Delete size',
        });
        deleteButton.connect('clicked', () => this._onDelete(this._index));
        this.add_suffix(deleteButton);
    }

    _onEditClicked() {
        const match = this._sizeString.match(/^(\d+)x(\d+)$/);
        if (match) {
            this._onEdit(this._index, parseInt(match[1], 10), parseInt(match[2], 10));
        }
    }
});

/**
 * Dialog for adding/editing a size
 */
const SizeDialog = GObject.registerClass({
    GTypeName: 'WindowResizerSizeDialog',
}, class SizeDialog extends Adw.Dialog {
    _init(width = 1000, height = 500, isEdit = false, onSave) {
        super._init({
            title: isEdit ? 'Edit Size' : 'Add Size',
            content_width: 400,
            content_height: 280,
        });

        this._onSave = onSave;

        // Main content box
        const content = new Adw.ToolbarView();

        // Header bar
        const headerBar = new Adw.HeaderBar();
        content.add_top_bar(headerBar);

        // Cancel button
        const cancelButton = new Gtk.Button({
            label: 'Cancel',
        });
        cancelButton.connect('clicked', () => this.close());
        headerBar.pack_start(cancelButton);

        // Save button
        const saveButton = new Gtk.Button({
            label: isEdit ? 'Save' : 'Add',
            css_classes: ['suggested-action'],
        });
        saveButton.connect('clicked', () => this._save());
        headerBar.pack_end(saveButton);

        // Form content
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            spacing: 12,
        });

        // Preferences group for inputs
        const inputGroup = new Adw.PreferencesGroup({
            title: 'Dimensions',
        });

        // Width entry
        this._widthRow = new Adw.SpinRow({
            title: 'Width',
            subtitle: 'Width in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 7680,
                step_increment: 10,
                page_increment: 100,
                value: width,
            }),
        });
        inputGroup.add(this._widthRow);

        // Height entry
        this._heightRow = new Adw.SpinRow({
            title: 'Height',
            subtitle: 'Height in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 4320,
                step_increment: 10,
                page_increment: 100,
                value: height,
            }),
        });
        inputGroup.add(this._heightRow);

        mainBox.append(inputGroup);

        // Common presets
        const presetsGroup = new Adw.PreferencesGroup({
            title: 'Quick Presets',
        });

        const presetsBox = new Gtk.FlowBox({
            homogeneous: true,
            column_spacing: 6,
            row_spacing: 6,
            max_children_per_line: 3,
            selection_mode: Gtk.SelectionMode.NONE,
        });

        const presets = [
            ['1920×1080', 1920, 1080],
            ['1280×720', 1280, 720],
            ['1000×1000', 1000, 1000],
            ['800×600', 800, 600],
            ['500×500', 500, 500],
            ['400×300', 400, 300],
        ];

        for (const [label, w, h] of presets) {
            const btn = new Gtk.Button({
                label: label,
                css_classes: ['pill'],
            });
            btn.connect('clicked', () => {
                this._widthRow.adjustment.value = w;
                this._heightRow.adjustment.value = h;
            });
            presetsBox.append(btn);
        }

        presetsGroup.add(presetsBox);
        mainBox.append(presetsGroup);

        content.set_content(mainBox);
        this.set_child(content);
    }

    _save() {
        const width = Math.round(this._widthRow.adjustment.value);
        const height = Math.round(this._heightRow.adjustment.value);

        if (width <= 0 || height <= 0) {
            return;
        }

        this._onSave(width, height);
        this.close();
    }
});

/**
 * Shortcut capture button
 */
const ShortcutButton = GObject.registerClass({
    GTypeName: 'WindowResizerShortcutButton',
    Signals: {
        'shortcut-changed': { param_types: [GObject.TYPE_STRING] },
    },
}, class ShortcutButton extends Gtk.Button {
    _init(accelerator) {
        super._init({
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });

        this._accelerator = accelerator;
        this._updateLabel();

        this.connect('clicked', () => this._startCapture());
    }

    _updateLabel() {
        if (this._accelerator) {
            const [success, key, mods] = Gtk.accelerator_parse(this._accelerator);
            if (success && (key !== 0 || mods !== 0)) {
                this.label = Gtk.accelerator_get_label(key, mods);
                return;
            }
        }
        this.label = 'Click to set';
        this.add_css_class('dim-label');
    }

    _startCapture() {
        this.label = 'Press shortcut...';
        this.remove_css_class('dim-label');

        // Create an event controller for key capture
        const controller = new Gtk.EventControllerKey();
        controller.connect('key-pressed', (ctrl, keyval, keycode, state) => {
            // Filter out modifier-only keys
            const realMods = state & Gtk.accelerator_get_default_mod_mask();

            if (keyval === Gdk.KEY_Escape) {
                this._updateLabel();
                this.remove_controller(controller);
                return Gdk.EVENT_STOP;
            }

            // Ignore modifier-only presses
            if (this._isModifierKey(keyval)) {
                return Gdk.EVENT_STOP;
            }

            // Require at least one modifier for shortcuts
            if (realMods === 0) {
                return Gdk.EVENT_STOP;
            }

            // Check if it's a valid accelerator
            if (!Gtk.accelerator_valid(keyval, realMods)) {
                return Gdk.EVENT_STOP;
            }

            this._accelerator = Gtk.accelerator_name(keyval, realMods);
            this._updateLabel();
            this.emit('shortcut-changed', this._accelerator);

            this.remove_controller(controller);
            return Gdk.EVENT_STOP;
        });

        this.add_controller(controller);
        this.grab_focus();
    }

    _isModifierKey(keyval) {
        return [
            Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
            Gdk.KEY_Control_L, Gdk.KEY_Control_R,
            Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
            Gdk.KEY_Super_L, Gdk.KEY_Super_R,
            Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
        ].includes(keyval);
    }

    get accelerator() {
        return this._accelerator;
    }

    set accelerator(value) {
        this._accelerator = value;
        this._updateLabel();
    }
});

/**
 * Main preferences window
 */
export default class WindowResizerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._window = window;

        window.set_default_size(550, 700);

        // Create main page
        const page = new Adw.PreferencesPage({
            title: 'Settings',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // ===== Sizes Group =====
        this._sizesGroup = new Adw.PreferencesGroup({
            title: 'Window Sizes',
            description: 'Define the sizes you want to resize windows to',
        });
        page.add(this._sizesGroup);

        // Add size button in header
        const addButton = new Gtk.Button({
            child: new Adw.ButtonContent({
                icon_name: 'list-add-symbolic',
                label: 'Add Size',
            }),
            css_classes: ['flat'],
        });
        addButton.connect('clicked', () => this._showAddDialog());
        this._sizesGroup.set_header_suffix(addButton);

        // Populate sizes
        this._populateSizes();

        // ===== Cycling Shortcuts Group =====
        const cycleGroup = new Adw.PreferencesGroup({
            title: 'Cycle Shortcuts',
            description: 'Shortcuts to cycle through window sizes',
        });
        page.add(cycleGroup);

        this._addShortcutRow(cycleGroup, 'Cycle Next', 'cycle-next',
            'Go to the next size in the list');

        this._addShortcutRow(cycleGroup, 'Cycle Previous', 'cycle-previous',
            'Go to the previous size in the list');

        // ===== Incremental Resize Group =====
        const incrementGroup = new Adw.PreferencesGroup({
            title: 'Incremental Resize',
            description: 'Grow or shrink windows by a fixed amount',
        });
        page.add(incrementGroup);

        // Width increment
        const widthIncrementRow = new Adw.SpinRow({
            title: 'Width Increment',
            subtitle: 'Pixels to add/remove from width',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 500,
                step_increment: 5,
                page_increment: 25,
                value: this._settings.get_int('increment-width'),
            }),
        });
        widthIncrementRow.adjustment.connect('value-changed', () => {
            this._settings.set_int('increment-width', widthIncrementRow.adjustment.value);
        });
        incrementGroup.add(widthIncrementRow);

        // Height increment
        const heightIncrementRow = new Adw.SpinRow({
            title: 'Height Increment',
            subtitle: 'Pixels to add/remove from height',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 500,
                step_increment: 5,
                page_increment: 25,
                value: this._settings.get_int('increment-height'),
            }),
        });
        heightIncrementRow.adjustment.connect('value-changed', () => {
            this._settings.set_int('increment-height', heightIncrementRow.adjustment.value);
        });
        incrementGroup.add(heightIncrementRow);

        // Increase shortcut
        this._addShortcutRow(incrementGroup, 'Increase Size', 'increment-increase',
            'Make window larger by the increment');

        // Decrease shortcut
        this._addShortcutRow(incrementGroup, 'Decrease Size', 'increment-decrease',
            'Make window smaller by the increment');

        // ===== Direct Shortcuts Group =====
        const directGroup = new Adw.PreferencesGroup({
            title: 'Direct Size Shortcuts',
            description: 'Jump directly to a specific size',
        });
        page.add(directGroup);

        // Add rows for each size shortcut (1-9)
        for (let i = 1; i <= 9; i++) {
            this._addShortcutRow(directGroup, `Size ${i}`, `size-${i}`,
                `Resize window to size ${i}`);
        }

        // ===== About Group =====
        const aboutGroup = new Adw.PreferencesGroup();
        page.add(aboutGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'Window Resizer',
            subtitle: 'Quickly resize windows to predefined sizes',
        });
        aboutRow.add_prefix(new Gtk.Image({
            icon_name: 'view-fullscreen-symbolic',
            pixel_size: 32,
        }));
        aboutGroup.add(aboutRow);
    }

    _populateSizes() {
        // Remove existing size rows that we've tracked
        if (this._sizeRows) {
            for (const row of this._sizeRows) {
                this._sizesGroup.remove(row);
            }
        }
        this._sizeRows = [];

        // Add current sizes
        const sizes = this._settings.get_strv('size-presets');
        sizes.forEach((size, index) => {
            const row = new SizeRow(
                size,
                index,
                (idx) => this._deleteSize(idx),
                (idx, w, h) => this._showEditDialog(idx, w, h)
            );
            this._sizesGroup.add(row);
            this._sizeRows.push(row);
        });

        // Show hint if no sizes
        if (sizes.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: 'No sizes configured',
                subtitle: 'Click "Add Size" to create your first preset',
            });
            emptyRow.add_prefix(new Gtk.Image({
                icon_name: 'dialog-information-symbolic',
            }));
            this._sizesGroup.add(emptyRow);
            this._sizeRows.push(emptyRow);
        }
    }

    _showAddDialog() {
        const dialog = new SizeDialog(
            1000, 500, false,
            (width, height) => {
                const sizes = this._settings.get_strv('size-presets');
                sizes.push(`${width}x${height}`);
                this._settings.set_strv('size-presets', sizes);
                this._populateSizes();
            }
        );
        dialog.present(this._window);
    }

    _showEditDialog(index, width, height) {
        const dialog = new SizeDialog(
            width, height, true,
            (newWidth, newHeight) => {
                const sizes = this._settings.get_strv('size-presets');
                sizes[index] = `${newWidth}x${newHeight}`;
                this._settings.set_strv('size-presets', sizes);
                this._populateSizes();
            }
        );
        dialog.present(this._window);
    }

    _deleteSize(index) {
        const sizes = this._settings.get_strv('size-presets');
        sizes.splice(index, 1);
        this._settings.set_strv('size-presets', sizes);
        this._populateSizes();
    }

    _addShortcutRow(group, title, settingKey, subtitle) {
        const row = new Adw.ActionRow({
            title: title,
            subtitle: subtitle,
        });

        // Get current shortcut
        const shortcuts = this._settings.get_strv(settingKey);
        const currentShortcut = shortcuts.length > 0 ? shortcuts[0] : '';

        // Create shortcut button
        const button = new ShortcutButton(currentShortcut);
        button.connect('shortcut-changed', (btn, accelerator) => {
            this._settings.set_strv(settingKey, [accelerator]);
        });

        // Clear button
        const clearButton = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Clear shortcut',
        });
        clearButton.connect('clicked', () => {
            this._settings.set_strv(settingKey, []);
            button.accelerator = '';
        });

        row.add_suffix(button);
        row.add_suffix(clearButton);
        row.set_activatable_widget(button);

        group.add(row);
    }
}
