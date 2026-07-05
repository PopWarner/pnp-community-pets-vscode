export interface PngSheetConfig {
    type: 'png-sheet';
    /** PNG filename relative to media/pets/ */
    src: string;
    frameWidth: number;
    frameHeight: number;
    /** Number of animation frames per row */
    framesPerRow: number;
    /** Pixels to inset from each cell's edge before cropping, so contributors
     *  can leave grid-guide lines baked into the sheet without them rendering. */
    framePadding?: number;
    /** Row index in the sheet for each animation state.
     *  Omit walkLeft to auto-mirror walkRight. */
    rows: {
        idle: number;
        walkRight: number;
        walkLeft?: number;
    };
    /** If true, the renderer replaces chromaColor pixels with the user's chosen tint. */
    tintable?: boolean;
    /** The chroma-key color to replace (default #FF00FF). Only used when tintable is true. */
    chromaColor?: string;
    /** User-chosen tint color, set at spawn time. Only present when tintable is true. */
    tintColor?: string;
    /** Fallback tint applied on non-interactive spawns (e.g. auto-spawn on startup)
     *  so a tintable mascot never appears with its raw chroma color unintentionally. */
    defaultTintColor?: string;
}

export interface SvgFramesConfig {
    type: 'svg-frames';
    /** Display size the frames are drawn at on the canvas */
    frameWidth: number;
    frameHeight: number;
    /** Arrays of SVG filenames (relative to media/pets/) per animation state.
     *  Walk-left files can be omitted — set to [] and the renderer mirrors walkRight. */
    frames: {
        idle: string[];
        walkRight: string[];
        walkLeft: string[];
    };
}

export interface GifConfig {
    type: 'gif';
    /** Display size on canvas — GIFs scale to fit */
    frameWidth: number;
    frameHeight: number;
    /** One GIF file per animation state, relative to media/pets/.
     *  Each GIF loops internally — no frame math needed.
     *  Omit walkLeft to auto-mirror walkRight. */
    frames: {
        idle: string;
        walkRight: string;
        walkLeft?: string;
    };
}

export type SpriteConfig = PngSheetConfig | SvgFramesConfig | GifConfig;

export interface SavedPet {
    /** Stable per-pet ID, assigned at spawn time. Lets a single pet be targeted
     *  later (removed, or have its speed adjusted) without respawning it. */
    id: string;
    mascotId: string;
    name: string;
    tintColor?: string;
    /** ID of a badge from the badge library, shown on a sign held by this pet. */
    signBadgeId?: string;
    /** Multiplier applied on top of the global pnpPets.speed setting. Default 1. */
    speedMultiplier?: number;
}

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    /** Logo/badge image filename, relative to media/badges/<id>/ */
    imageFile: string;
    /** Optional URL opened when the sign is clicked (e.g. a Credly badge page or event site) */
    linkUrl?: string;
}

export interface MascotDefinition {
    id: string;
    name: string;
    description: string;
    sprite: SpriteConfig;
    /** Credly badge ID that unlocks this mascot */
    unlockedByBadgeId?: string;
    tags: string[];
    /** If true, this mascot is excluded from the spawn picker but can still be
     *  selected directly via the pnpPets.mascot setting or a badge unlock. */
    hidden?: boolean;
}
