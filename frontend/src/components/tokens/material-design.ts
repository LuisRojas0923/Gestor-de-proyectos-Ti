// Material Design Tokens
// Basado en las especificaciones oficiales de Google Material Design

export const materialDesignTokens = {
  // Colores principales vinculados a variables CSS dinámicas
  colors: {
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: 'var(--color-primary)',    // Dinámico
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1'
    },
    navy: 'var(--deep-navy)',

    secondary: {
      50: '#fff3e0',
      100: '#ffe0b2',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: 'var(--color-secondary)', // Dinámico
      600: '#fb8c00',
      700: '#f57c00',
      800: '#ef6c00',
      900: '#e65100'
    },

    // Colores semánticos
    semantic: {
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: 'var(--color-primary-light)'
    },

    // Colores de superficie
    surface: {
      light: 'var(--color-surface)',
      dark: 'var(--color-surface)',
      variant: {
        light: 'var(--color-surface-variant)',
        dark: 'var(--color-surface-variant)'
      }
    },

    // Colores de texto
    text: {
      primary: {
        light: 'var(--color-text-primary)',
        dark: 'var(--color-text-primary)'
      },
      secondary: {
        light: 'var(--color-text-secondary)',
        dark: 'var(--color-text-secondary)'
      },
      disabled: {
        light: 'rgba(0, 0, 0, 0.38)',
        dark: 'rgba(255, 255, 255, 0.38)'
      }
    },

    // Colores de fondo
    background: {
      light: 'var(--color-background)',
      dark: 'var(--color-background)'
    }
  },

  // Tipografía de Material Design
  typography: {
    fontFamily: {
      primary: 'Roboto, sans-serif',
      secondary: 'Roboto, sans-serif',
      mono: 'Roboto Mono, monospace'
    },

    fontSize: {
      // Material Design typography scale
      caption: '0.75rem',    // 12px
      body2: '0.875rem',     // 14px
      body1: '1rem',         // 16px
      subtitle2: '0.875rem', // 14px
      subtitle1: '1rem',     // 16px
      h6: '1.25rem',         // 20px
      h5: '1.5rem',          // 24px
      h4: '2.125rem',        // 34px
      h3: '3rem',            // 48px
      h2: '3.75rem',         // 60px
      h1: '6rem'             // 96px
    },

    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700'
    },

    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  },

  // Espaciado de Material Design (múltiplos de 8px)
  spacing: {
    unit: '8px',
    0: '0',
    1: '4px',   // 0.5 * 8
    2: '8px',   // 1 * 8
    3: '12px',  // 1.5 * 8
    4: '16px',  // 2 * 8
    5: '20px',  // 2.5 * 8
    6: '24px',  // 3 * 8
    8: '32px',  // 4 * 8
    10: '40px', // 5 * 8
    12: '48px', // 6 * 8
    16: '64px', // 8 * 8
    20: '80px', // 10 * 8
    24: '96px'  // 12 * 8
  },

  // Elevación (sombras) de Material Design
  elevation: {
    0: 'none',
    1: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
    2: '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
    3: '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
    4: '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
    5: '0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)',
    6: '0px 25px 50px rgba(0, 0, 0, 0.25)',
    8: '0px 8px 10px rgba(0, 0, 0, 0.14), 0px 3px 14px rgba(0, 0, 0, 0.12), 0px 5px 5px rgba(0, 0, 0, 0.20)',
    9: '0px 9px 12px rgba(0, 0, 0, 0.15), 0px 3px 16px rgba(0, 0, 0, 0.12), 0px 5px 6px rgba(0, 0, 0, 0.20)',
    12: '0px 12px 17px rgba(0, 0, 0, 0.14), 0px 5px 22px rgba(0, 0, 0, 0.12), 0px 7px 8px rgba(0, 0, 0, 0.20)',
    16: '0px 16px 24px rgba(0, 0, 0, 0.14), 0px 6px 30px rgba(0, 0, 0, 0.12), 0px 8px 10px rgba(0, 0, 0, 0.20)',
    24: '0px 24px 38px rgba(0, 0, 0, 0.14), 0px 9px 46px rgba(0, 0, 0, 0.12), 0px 11px 15px rgba(0, 0, 0, 0.20)'
  },

  // Bordes de Material Design
  borders: {
    radius: {
      none: '0',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '50%'
    },

    width: {
      thin: '1px',
      medium: '2px',
      thick: '4px'
    }
  },

  // Breakpoints responsivos
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '960px',
    lg: '1280px',
    xl: '1920px'
  },

  // Transiciones de Material Design
  transitions: {
    duration: {
      shortest: '150ms',
      shorter: '200ms',
      short: '250ms',
      standard: '300ms',
      complex: '375ms',
      enteringScreen: '225ms',
      leavingScreen: '195ms'
    },

    easing: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)'
    }
  },

  // Z-index de Material Design
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500
  },

  // Escala de tamaños de iconos
  icon: {
    size: {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32,
      xxl: 48
    }
  }
};

// Hook para usar los tokens
export const useMaterialDesignTokens = () => {
  return materialDesignTokens;
};

// Función helper para obtener colores con opacidad
export const getColorWithOpacity = (color: string, opacity: number) => {
  // Convierte hex a rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Función helper para obtener elevación
export const getElevation = (level: keyof typeof materialDesignTokens.elevation) => {
  return materialDesignTokens.elevation[level];
};

// Función helper para obtener espaciado
export const getSpacing = (multiplier: number) => {
  return `${multiplier * 8}px`;
};
