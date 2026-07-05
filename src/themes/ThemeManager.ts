import { ThemeDefinition } from './types';

const themes: ThemeDefinition[] = [
    {
        id: 'default',
        name: 'Default',
        background: 'var(--vscode-editor-background, #1e1e1e)'
    },
    {
        id: 'winter',
        name: 'Winter',
        background: 'linear-gradient(180deg, #0d1b2e 0%, #1a3a5c 100%)',
        overlaySprite: 'snowflakes.png',
        autoActivate: { startMonth: 12, startDay: 1, endMonth: 1, endDay: 6 }
    },
    {
        id: 'spring',
        name: 'Spring',
        background: 'linear-gradient(180deg, #d4edda 0%, #a8d5b5 100%)',
        autoActivate: { startMonth: 3, startDay: 20, endMonth: 6, endDay: 20 }
    },
    {
        id: 'halloween',
        name: 'Halloween',
        background: 'linear-gradient(180deg, #1a0a2e 0%, #3d1a00 100%)',
        overlaySprite: 'bats.png',
        autoActivate: { startMonth: 10, startDay: 1, endMonth: 11, endDay: 1 }
    },
    {
        id: 'ignite',
        name: 'Microsoft Ignite',
        background: 'linear-gradient(135deg, #0078d4 0%, #004e8c 100%)'
    },
    {
        id: 'build',
        name: 'Microsoft Build',
        background: 'linear-gradient(135deg, #00b7c3 0%, #005a9e 100%)'
    }
];

const _themeMap = new Map<string, ThemeDefinition>(themes.map(t => [t.id, t]));

export const ThemeManager = {
    getById: (id: string): ThemeDefinition | undefined => _themeMap.get(id),

    getAll: (): ThemeDefinition[] => [...themes],

    getAutoTheme: (): ThemeDefinition | undefined => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const current = month * 100 + day;

        return themes.find(t => {
            if (!t.autoActivate) { return false; }
            const { startMonth, startDay, endMonth, endDay } = t.autoActivate;
            const start = startMonth * 100 + startDay;
            const end = endMonth * 100 + endDay;
            // Handles ranges that wrap across year-end (e.g. Dec 1 → Jan 6)
            return start <= end
                ? current >= start && current <= end
                : current >= start || current <= end;
        });
    },

    register: (theme: ThemeDefinition): void => {
        _themeMap.set(theme.id, theme);
        themes.push(theme);
    }
};
