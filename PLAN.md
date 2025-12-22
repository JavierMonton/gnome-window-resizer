# GNOME Window Resizer Extension - Project Plan

## Overview

A GNOME Shell extension that allows users to predefine window sizes and quickly resize the focused window using keyboard shortcuts.

## Features

### Core Features
1. **Predefined Window Sizes**: Store a list of custom window dimensions (width × height)
2. **Direct Size Shortcuts**: Individual shortcuts for each size (e.g., `Super+Alt+1` for size 1)
3. **Cycle Through Sizes**: 
   - Forward shortcut (cycles through sizes in order)
   - Backward shortcut (cycles in reverse order)
4. **Visual Settings UI**: Configure sizes and shortcuts through GNOME's extension preferences

### User Experience
- Sizes are applied to the currently focused window
- Cycling remembers the current position per window
- Smooth integration with GNOME Shell

---

## Technical Architecture

### GNOME Shell Extension Structure

```
gnome-resizer/
├── src/
│   ├── metadata.json          # Extension metadata (UUID, name, version, GNOME compatibility)
│   ├── extension.js           # Main extension logic (ESM module for GNOME 45+)
│   ├── prefs.js               # Preferences UI (GTK4/Adwaita)
│   ├── stylesheet.css         # Optional custom styles
│   └── schemas/
│       └── org.gnome.shell.extensions.gnome-resizer.gschema.xml
├── scripts/
│   ├── build.sh               # Build and package script
│   ├── install-local.sh       # Install for development
│   └── pack.sh                # Create .zip for extensions.gnome.org
├── PLAN.md                    # This file
├── README.md                  # User documentation
├── LICENSE                    # GPL-3.0 (required for GNOME extensions)
└── .gitignore
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Shell Integration | GNOME Shell JavaScript (ESM) |
| Settings Storage | GSettings with XML Schema |
| Preferences UI | GTK4 + libadwaita |
| Window Management | Meta.Window API |
| Keyboard Shortcuts | Meta.KeyBindingFlags |

### GSettings Schema

```xml
<key name="window-sizes" type="a(ii)">
  <!-- Array of (width, height) tuples -->
  <default>[(1000, 500), (1000, 1000), (1920, 1080)]</default>
</key>

<key name="cycle-forward" type="s">
  <default>'&lt;Super&gt;&lt;Alt&gt;bracketright'</default>
</key>

<key name="cycle-backward" type="s">
  <default>'&lt;Super&gt;&lt;Alt&gt;bracketleft'</default>
</key>

<key name="size-shortcuts" type="as">
  <!-- Shortcuts for individual sizes -->
  <default>['&lt;Super&gt;&lt;Alt&gt;1', '&lt;Super&gt;&lt;Alt&gt;2', ...]</default>
</key>
```

---

## Implementation Plan

### Phase 1: Project Setup
- [ ] Create directory structure
- [ ] Create metadata.json
- [ ] Create GSettings schema
- [ ] Set up build scripts

### Phase 2: Core Extension
- [ ] Implement extension.js with:
  - Extension enable/disable lifecycle
  - Window size management
  - Keyboard shortcut registration
  - Size cycling logic (forward/backward)
  - Per-window state tracking

### Phase 3: Preferences UI
- [ ] Implement prefs.js with:
  - GTK4/Adwaita preferences window
  - Size list management (add/remove/edit)
  - Shortcut configuration
  - Live preview of settings

### Phase 4: Polish & Testing
- [ ] Test on GNOME 46 with Wayland
- [ ] Handle edge cases (no focused window, invalid sizes)
- [ ] Add user-friendly notifications/feedback

### Phase 5: Distribution
- [ ] Create proper README
- [ ] Package for extensions.gnome.org
- [ ] Submit for review

---

## Build & Installation

### Development Installation

```bash
# 1. Compile GSettings schema
glib-compile-schemas src/schemas/

# 2. Create symlink to GNOME extensions directory
ln -sf "$(pwd)/src" ~/.local/share/gnome-shell/extensions/gnome-resizer@jmonton

# 3. Restart GNOME Shell (on X11: Alt+F2, type 'r', press Enter)
# On Wayland: Log out and log back in

# 4. Enable extension
gnome-extensions enable gnome-resizer@jmonton
```

### Production Build

```bash
# Create distributable .zip file
./scripts/pack.sh
# Output: gnome-resizer@jmonton.zip
```

### Publishing to extensions.gnome.org

1. Create account at https://extensions.gnome.org
2. Go to "Upload Extension"
3. Upload the .zip file
4. Fill in metadata (description, screenshots)
5. Submit for review (typically 1-2 weeks)

---

## Key Technical Considerations

### Wayland Compatibility
- Window resizing works via `Meta.Window.move_resize_frame()`
- Some positioning restrictions exist on Wayland vs X11
- Tested with GNOME Shell 46 on Ubuntu 24.04

### GNOME 45+ Module System
- Uses ESM (ECMAScript Modules) with `import`/`export`
- Extension class must extend `Extension.Extension`
- Preferences must extend `ExtensionPreferences`

### State Management
- Use a Map to track current size index per window
- Clean up state when windows are destroyed
- Settings changes apply immediately

---

## Files to Create

1. `src/metadata.json` - Extension identity
2. `src/extension.js` - Main logic (~200 lines)
3. `src/prefs.js` - Preferences UI (~300 lines)
4. `src/schemas/org.gnome.shell.extensions.gnome-resizer.gschema.xml` - Settings schema
5. `scripts/build.sh` - Development build
6. `scripts/install-local.sh` - Local installation
7. `scripts/pack.sh` - Distribution packaging
8. `README.md` - User documentation
9. `LICENSE` - GPL-3.0
10. `.gitignore` - Git ignore rules

---

## Next Steps

Starting implementation in this order:
1. Project structure and build system
2. GSettings schema
3. Core extension logic
4. Preferences UI
5. Documentation and packaging

