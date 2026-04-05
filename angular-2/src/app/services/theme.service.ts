import { Injectable } from '@angular/core';

import { DARK_THEME, DEFAULT_THEME, LIGHT_THEME, THEME_STORAGE_KEY } from '../core/theme.constants';
import { Theme } from '../core/theme.type';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly storageKey = THEME_STORAGE_KEY;

    getTheme(): Theme {
        const storedTheme = localStorage.getItem(this.storageKey);
        const theme = this.isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;

        return theme;
    }

    setTheme(theme: Theme): void {
        localStorage.setItem(this.storageKey, theme);
    }

    private isTheme(value: string | null): value is Theme {
        const isValidTheme = value === LIGHT_THEME || value === DARK_THEME;

        return isValidTheme;
    }
}
