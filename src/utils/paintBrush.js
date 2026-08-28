// Shared stroke-rendering logic for the Paint tool, used by all three
// places that draw paint strokes onto a canvas: the live drawing overlay
// (EditorV2.jsx's redraw effect), and both flatten paths in
// PaintMaskPanel.jsx (cover tight-crop, cutout full-frame). Extracted here
// so brush-type/opacity/erase behavior can never drift between preview and
// what actually gets saved/exported -- before this, the three call sites
// were near-duplicate copies of the same stroke loop, which is exactly the
// kind of divergence risk that already caused a real preview/export bug
// once (see docs/paint-mask-editing-tool-design.md).
//
// A stroke shape: { points: [[x,y], ...], size, color, brushType, opacity, erase }
// - brushType: "hard" (default, round cap/join) | "soft" (blurred edge) | "square" (square cap/miter join)
// - opacity: 0-1, ignored when erase is true (erasing is always full-strength)
// - erase: boolean -- true means this stroke removes pixels from everything
//   drawn before it (destination-out), matching Photoshop's raster eraser.
//   Relies on the canvas being fully re-rendered from scratch (clear +
//   redraw all strokes in stroke-list order) on every change, which all
//   three call sites already do.
export function renderStroke(ctx, stroke, dpr, offsetX = 0, offsetY = 0) {
  const { points, size, color, brushType = "hard", opacity = 1, erase = false } = stroke;
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
  ctx.globalAlpha = erase ? 1 : opacity;
  ctx.lineCap = brushType === "square" ? "square" : "round";
  ctx.lineJoin = brushType === "square" ? "miter" : "round";
  ctx.strokeStyle = erase ? "#000000" : color; // color value irrelevant for destination-out, just needs to be set
  ctx.lineWidth = size * dpr;

  const draw = () => {
    ctx.beginPath();
    ctx.moveTo((points[0][0] - offsetX) * dpr, (points[0][1] - offsetY) * dpr);
    for (const [x, y] of points.slice(1)) ctx.lineTo((x - offsetX) * dpr, (y - offsetY) * dpr);
    ctx.stroke();
  };

  if (brushType === "soft" && !erase) {
    // Soft/feathered edge: draw the stroke through a blur filter. Erase
    // strokes stay hard-edged regardless of brushType -- a "soft eraser"
    // would leave a partially-erased ring that reads as a rendering bug
    // rather than an intentional feather, and isn't part of this pass's ask.
    ctx.filter = `blur(${Math.max(1, (size * dpr) / 4)}px)`;
    draw();
    ctx.filter = "none";
  } else {
    draw();
  }

  ctx.restore();
}
