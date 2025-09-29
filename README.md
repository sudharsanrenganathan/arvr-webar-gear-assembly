# AR Worm Gear for Crankshaft (WebAR, A-Frame + AR.js)

This is a turnkey WebAR project that runs in the browser using your device camera. Scan a Hiro marker to spawn an assembly surface, drag and drop parts (crankshaft, worm, gear), follow the watermark guidance, and once assembled press Play to animate the crankshaft.

## Quick Start

- Open `c:\ARVR\webar\index.html` in a modern mobile browser.
  - Preferably serve over HTTP(s) due to camera permissions.
  - Easiest: use VS Code Live Server, or run one of these in the `webar` folder:
    - Python 3: `python -m http.server 8080`
    - Node: `npx http-server -p 8080`
- Print or display the Hiro marker: https://raw.githubusercontent.com/AR-js-org/AR.js/master/three.js/examples/marker-training/examples/pattern-files/pattern-hiro.patt (QR-like pattern).
- Point your camera to the marker and assemble parts in order (watch the bottom watermark text).

## Controls

- **Drag & Drop**: Touch and drag parts into place.
- **Reset**: Resets parts and steps.
- **Hint**: Briefly highlights the target snap zone.
- **Play/Stop**: Toggles final rotation animation after assembly.

## How it works

- Uses `A-Frame` and `AR.js` (marker tracking) via CDN.
- Custom components in `js/app.js` implement:
  - `draggable`: screen-to-world dragging on a ground plane.
  - `snap-zone`: proximity-based snapping with tolerance.
  - `assembly-manager`: step logic, guidance watermark, and animations.

## Swap to your own gear image (image tracking)

For scanning a custom 2D gear image instead of a Hiro marker, switch to MindAR image tracking:

1. Replace `<a-marker>` with a MindAR image anchor using `mindar-image-aframe` (CDN) and generate a target file (`.mind`) from your gear image.
2. Update the scene to use `mindar-image` and anchors. Reuse `assemblyRoot` and components unchanged.

This repo ships with marker tracking to be instantly runnable. If you want, I can add MindAR conversion and files for your specific image.

## Notes

- The shapes are simplified primitives to stand in for the actual worm gear and crankshaft.
- For production, import real `.glb` CAD exports and adjust snap zones.
- Test on Chrome Android or Safari iOS. Ensure camera permissions are granted.
