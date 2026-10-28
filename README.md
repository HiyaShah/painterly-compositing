# Stillwood · A painterly compositing playground

playground inspired by **Brushing Up on Illumination: Temporal Coherence in Painterly Compositing in Disney and Pixar’s Hoppers**, by Greg Finch, Jon Reisch, Dan Enstrom, and Chia-Chi Hu (SIGGRAPH Talks 2026).

[Reference paper](https://research.pixar.com/docs/2026.SiggraphTalks.FRE.pdf) · [Project repository](https://github.com/HiyaShah/painterly-compositing)

<img width="873" height="681" alt="Screenshot 2026-10-27 at 10 04 29 PM" src="https://github.com/user-attachments/assets/02d5dd21-d13f-4667-9c43-e0b92a74f86c" />


## Try it

- **Lit scene:** the procedural forest with baked directional lighting, before the brush overlay.
- **Per-frame:** resample brushstroke positions and variation at 12 Hz. Watch the strokes shimmer as the camera moves.
- **Coherent:** keep the same 3D points, colors, and brush identities across frames. The camera-facing cards move with the projected scene.
- **Compare:** a wipe between per-frame resampling on the left and coherent anchors on the right. Drag the comparison slider to change the split.
- **Camera timeline:** play/pause or scrub a 16-second camera path. The camera moves back and forth. Scrubbing pauses playback. Pause freezes the stroke resampling too. Change speed with the 1× button.
- **Brush controls:** change world-space stroke size, maximum count, opacity, rotation variation, and depth compensation. At 0% depth compensation, strokes shrink naturally with perspective; at 100%, they retain approximately the same screen size.
- **Brush library:** three procedural paint masks: dry brush, soft daub, and long bristle.
- **Point coverage:** choose a union of seven camera frusta or only the first frame’s frustum. The latter leaves areas without brush coverage later in the camera move; the underlying lit scene remains visible.
- **Reveal point cloud:** show small colored points at the stroke anchors.
- **Atmospheric haze:** toggle matching distance fog for the mesh scene and brush cards.
- **Reset:** restore controls and camera. Reduced-motion preferences start playback paused.

## How it works

1. Build a procedural forest out of triangle meshes. Bake an approximate directional-light response into vertex colors.
2. Sample triangle surfaces with probability proportional to triangle area and an authored density multiplier. Use square-root barycentric sampling for uniform samples within each triangle. Interpolate vertex colors onto each point.
3. Keep the random seed fixed for the coherent point set. Retain per-point variation so scale, color variation, and orientation do not change across frames.
4. Filter the samples against either the starting camera frustum or the union of seven camera frusta.
5. Render textured, camera-facing cards with instanced geometry. Test them against the scene’s depth buffer, blend them over the mesh render, then apply matching fog in the brush shader.
6. For the intentionally unstable comparison, cycle through eight independently seeded surface samples at 12 Hz. This is a deliberately exaggerated resampling illustration, not an exact model of path-traced deep-data noise.

The overlay uses one instanced draw call per view, alongside one merged draw call for the static forest. Three.js is vendored locally. The interface uses system fonts and does not depend on a CDN.

## Relationship to the paper

This demonstrates the paper’s central separation: **stable 3D placement, independently adjustable painterly appearance**. The paper’s actual pipeline uses processed clean background plates, deep render data merged across representative frames, Houdini point-cloud preparation, USD, Nuke compositing, and a separate solution for painted reflections.

This demo substitutes procedural surface samples and baked lighting. It does **not** load deep EXRs, reconstruct occluded background surfaces, import USD, reproduce Nuke’s node system, or implement reflections. Coverage is a **frustum-only** approximation, not a visibility or occlusion test. Card transparency ordering is approximate, there is no production edge-matte system, and the meshes are static. Brush color comes from interpolated baked surface lighting, rather than a sampled graded image plate. There is no AI image generation or style-transfer model.


