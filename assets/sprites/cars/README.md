# Car Sprite Assets

Drop sprites in these folders and they will auto-load in race playback.

## Required base file
- `assets/sprites/cars/default.svg` or `assets/sprites/cars/default.png`

## Team sprites (recommended set)
- `assets/sprites/cars/teams/red-bull-racing.svg` or `.png`
- `assets/sprites/cars/teams/ferrari.svg` or `.png`
- `assets/sprites/cars/teams/mercedes.svg` or `.png`
- `assets/sprites/cars/teams/mclaren.svg` or `.png`
- `assets/sprites/cars/teams/aston-martin.svg` or `.png`
- `assets/sprites/cars/teams/alpine.svg` or `.png`
- `assets/sprites/cars/teams/williams.svg` or `.png`
- `assets/sprites/cars/teams/rb.svg` or `.png`
- `assets/sprites/cars/teams/kick-sauber.svg` or `.png`
- `assets/sprites/cars/teams/haas-f1-team.svg` or `.png`

## Driver overrides (current race: 2024 R11)
If present, these override team sprites:
- `assets/sprites/cars/codes/RUS.svg` or `.png`
- `assets/sprites/cars/codes/PIA.svg` or `.png`
- `assets/sprites/cars/codes/SAI.svg` or `.png`
- `assets/sprites/cars/codes/HAM.svg` or `.png`
- `assets/sprites/cars/codes/VER.svg` or `.png`
- `assets/sprites/cars/codes/HUL.svg` or `.png`
- `assets/sprites/cars/codes/PER.svg` or `.png`
- `assets/sprites/cars/codes/MAG.svg` or `.png`
- `assets/sprites/cars/codes/RIC.svg` or `.png`
- `assets/sprites/cars/codes/GAS.svg` or `.png`
- `assets/sprites/cars/codes/LEC.svg` or `.png`
- `assets/sprites/cars/codes/OCO.svg` or `.png`
- `assets/sprites/cars/codes/STR.svg` or `.png`
- `assets/sprites/cars/codes/TSU.svg` or `.png`
- `assets/sprites/cars/codes/ALB.svg` or `.png`
- `assets/sprites/cars/codes/BOT.svg` or `.png`
- `assets/sprites/cars/codes/ZHO.svg` or `.png`
- `assets/sprites/cars/codes/ALO.svg` or `.png`
- `assets/sprites/cars/codes/SAR.svg` or `.png`
- `assets/sprites/cars/codes/NOR.svg` or `.png`

## Artwork spec
- Top-down view.
- Car nose points to the right.
- Transparent background (required for best results; opaque photo-style images are auto-rejected).
- Recommended canvas: `320x120` (or `256x96`).

## Priority order
1. Driver code file (e.g. `codes/VER.svg`)
2. Team file (e.g. `teams/red-bull-racing.svg`)
3. `default` sprite (`.svg` or `.png`)

You can still use JSON `assets.carSprites` if you want custom paths/scales.
