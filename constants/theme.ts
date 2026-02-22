/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


const Palettes = {
  river: {
    primary: '#E4002B', // River Red
    secondary: '#FFFFFF',
    text: '#111111',
  },
  macabi: {
    primary: '#4DA8DA', // Macabi Light Blue (approx)
    secondary: '#FFFFFF',
    text: '#111111',
  },
  elegant: {
    background: '#121212', // Dark background like the card
    gold: '#D4AF37', // Gold accent
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
  },
};

const tintColorLight = Palettes.river.primary;
const tintColorDark = Palettes.elegant.gold;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: Palettes.elegant.text,
    background: Palettes.elegant.background,
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  // Expose specific palettes for usage in components
  ...Palettes
};

export const Fonts = {
  sans: 'Montserrat_400Regular',
  bold: 'Montserrat_700Bold',
  light: 'Montserrat_300Light',
};
