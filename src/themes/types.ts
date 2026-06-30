export interface ThemeDefinition {
    id: string;
    name: string;
    /** CSS color, gradient, or vscode variable for the panel background */
    background: string;
    /** Overlay sprite filename (relative to media/themes/) for effects like snow or bats */
    overlaySprite?: string;
    /** Month/day range during which this theme is auto-selected (month is 1-based) */
    autoActivate?: {
        startMonth: number;
        startDay: number;
        endMonth: number;
        endDay: number;
    };
}
