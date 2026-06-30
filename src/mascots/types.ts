export interface PngSheetConfig {
    type: 'png-sheet';
    /** PNG filename relative to media/pets/ */
    src: string;
    frameWidth: number;
    frameHeight: number;
    /** Number of animation frames per row */
    framesPerRow: number;
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

export interface MascotDefinition {
    id: string;
    name: string;
    description: string;
    sprite: SpriteConfig;
    /** Credly badge ID that unlocks this mascot */
    unlockedByBadgeId?: string;
    tags: string[];
}
