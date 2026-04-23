---
version: 1.0.0
design_system:
  name: "Gestor de Proyectos TI"
  typography:
    fonts:
      primary: "Roboto, sans-serif"
      secondary: "Inter, system-ui, -apple-system, sans-serif"
      monospace: "Roboto Mono, monospace"
    weights:
      light: 300
      regular: 400
      medium: 500
      bold: 700
      black: 900
  colors:
    brand:
      deep_navy: "#002060"
      powder_blue: "#b4c6e7"
      lavender: "#d9e1f2"
      dust_grey: "#d0d0d0"
      white: "#ffffff"
      navy_dark: "#001a4d"
      navy_darker: "#0a0e17"
      surface_dark: "#121826"
      surface_variant_dark: "#1e293b"
    theme:
      light:
        primary: "{colors.brand.deep_navy}"
        primary_500: "{colors.brand.deep_navy}"
        primary_900: "{colors.brand.navy_dark}"
        primary_light: "{colors.brand.powder_blue}"
        secondary: "{colors.brand.lavender}"
        background: "{colors.brand.dust_grey}"
        surface: "{colors.brand.white}"
        surface_variant: "{colors.brand.lavender}"
        text_primary: "#000000"
        text_secondary: "#374151"
        border: "#a1a1aa"
      dark:
        primary: "{colors.brand.powder_blue}"
        primary_500: "{colors.brand.powder_blue}"
        primary_900: "#93aed9"
        primary_light: "{colors.brand.deep_navy}"
        secondary: "{colors.brand.lavender}"
        background: "{colors.brand.navy_darker}"
        surface: "{colors.brand.surface_dark}"
        surface_variant: "{colors.brand.surface_variant_dark}"
        text_primary: "{colors.brand.white}"
        text_secondary: "#f3f4f6"
        border: "#475569"
    semantic:
      secondary_500: "#00B388"
      neutral_100: "#f5f5f5"
      neutral_800: "#262626"
  components:
    tag_badge:
      light:
        background: "{colors.semantic.neutral_100}"
        color: "#111827"
      dark:
        background: "{colors.semantic.neutral_800}"
        color: "#f9fafb"
  spacing:
    18: "4.5rem"
    88: "22rem"
  radii:
    tag_badge: "0.125rem"
  motion:
    slide_in: "slideIn 0.3s ease-out"
    fade_in: "fadeIn 0.2s ease-out"
    bounce_subtle: "bounceSubtle 0.6s ease-out"
    pulse_subtle: "pulse-subtle 3s infinite ease-in-out"
---

# Design System Intent

## Look and Feel
The Gestor de Proyectos TI application uses a professional, corporate design language characterized by crisp contrasts, deep navy blues, and structured information density. It is built to support both complex administrative dashboards and clear operational readouts. The aesthetic is clean, utility-focused, and highly legible.

## Core Characteristics

### 1. Corporate Utility
The color palette heavily relies on deep navy and powder blue, evoking trust, stability, and professionalism. The design avoids unnecessary embellishments, focusing instead on clearly delineated regions (surfaces, variants, backgrounds) to structure high-density data cleanly. 

### 2. Dual-Theme Contrast
The system natively supports light and dark modes with a carefully inverted contrast model:
- In **Light Mode**, a dust grey background separates crisp white surfaces, creating a subtle depth hierarchy. Deep navy acts as the primary accent and text color for maximum legibility.
- In **Dark Mode**, backgrounds drop to a near-black navy with lighter slate-blue surfaces. The primary accent shifts to powder blue to maintain contrast without harsh brightness.

### 3. Typography & Information Hierarchy
Using **Roboto** as the primary typeface ensures excellent readability across diverse screen sizes, critical for a project management tool. **Roboto Mono** is reserved for tabular data, IDs, and technical information where vertical alignment and distinct character recognition are paramount. The hierarchy is established through strong font weight contrasts (e.g., medium/bold headers vs. light/regular body text) rather than purely size differences.

### 4. Interactive Affordance & Motion
Interactivity is communicated through subtle elevation changes and micro-animations. 
- Buttons and interactive elements elevate on hover (`shadow-sm` to `shadow-md`), providing tactile feedback.
- Motion is intentional and restrained. `bounce-subtle` and `pulse-subtle` animations are used sparingly to draw attention to actionable states or loading processes without overwhelming the user or feeling frivolous.

### 5. High-Density Components
Components like the `tag_badge` are specifically designed for maximum information density within tables and lists. With an exceptionally small base font size, tight tracking, and minimalistic rounded corners, they allow for clear categorization without cluttering the interface.
