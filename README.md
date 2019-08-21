# Pyramid-Scene
Sci-fi scene made with Three.js and custom shaders, based on the composition from https://youtu.be/-h6JLUctbYs.

The scene is composed out of 7 objects: the pyramid, human, glowy ring, floor, orange particles and 2 glow sprites for both light sources. With the unreal bloom pass it makes for 21 draw calls.

Noise textures were essentials for the effects. I wrote a custom emission shader for the pyramid, while the floor is a plane with a modified MeshStandardMaterial with “color-ramped” (blender node) noise values modifying it’s roughness and bump factors. Different effects can be tested by changing color ramps’ min and max points with controls’ “CR1” & “CR2” properties.
I left behind some values for fun and testing :)
