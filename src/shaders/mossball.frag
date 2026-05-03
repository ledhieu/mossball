// Made by Hieu Le — leduchieu.com

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;

varying float vHeight;
varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vLengthScale;

void main() {
  float t = vHeight;
  float shade = smoothstep(0.0, 0.85, t);
  vec3 color = mix(uBaseColor, uTipColor, shade);

  // Long strands are inherently brighter / more vibrant
  float longFactor = smoothstep(1.0, 3.5, vLengthScale);
  color *= 1.0 + longFactor * 0.35;

  // Prominent wrap-around lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  // Top light from above, slightly toward back — warm and strong
  vec3 topLightDir = normalize(vec3(0.0, 1.0, -0.35));
  float topDiff = dot(normal, topLightDir) * 0.5 + 0.5;
  vec3 topLight = vec3(1.0, 0.92, 0.72) * topDiff * 1.15;

  // Back fill — warm amber wrap-around
  float backDiff = (-normal.z) * 0.5 + 0.5;
  vec3 backLight = vec3(0.88, 0.80, 0.60) * backDiff * 1.20;

  // Prominent Fresnel rim — warm gold
  float rim = 1.0 - abs(dot(normal, viewDir));
  vec3 rimLight = vec3(0.75, 0.68, 0.50) * pow(rim, 3.0) * 1.20;

  // Color tone: heavy desaturate+darken in shadow, strong yellow-gold in bright/backlight
  float rawLight = topDiff * 1.15 + backDiff * 0.90 + pow(rim, 3.0) * 0.70;
  float lightLevel = rawLight / 2.75;
  vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
  // Front/no-light: deep black-green, heavily desaturated
  color = mix(color, gray * 0.18, smoothstep(0.5, 0.0, lightLevel) * 0.75);
  // Mid-bright: green-yellow boost
  color = mix(color, vec3(1.0, 0.88, 0.22), smoothstep(0.20, 0.75, lightLevel) * 0.30);
  // Strong backlight rim: extra golden amber
  float backLit = smoothstep(0.55, 0.95, backDiff) * smoothstep(0.2, 0.7, rim);
  color = mix(color, vec3(1.0, 0.78, 0.12), backLit * 0.45);

  // Extra front-facing darken — where no backlight reaches, go much darker
  float frontFacing = normal.z * 0.5 + 0.5; // 1.0 = front, 0.0 = back
  float noBackLight = 1.0 - smoothstep(0.0, 0.5, backDiff);
  color *= mix(1.0, 0.35, frontFacing * noBackLight * 0.15);

  // Inherent radial gradient: darker + more saturated near ball center
  // Long strands skip this and keep normal green
  float isLong = step(1.0, vLengthScale);
  float radialDist = length(vWorldPos);
  float centerMask = (1.0 - smoothstep(2.5, 6.0, radialDist)) * (1.0 - isLong);
  color *= mix(1.0, 0.82, centerMask); // darken near center
  vec3 lum = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
  color = mix(lum, color, 1.0 + centerMask * 0.2); // saturate near center

  vec3 ambient = vec3(0.08);
  vec3 lighting = ambient + topLight + backLight + rimLight;

  vec3 litColor = color * lighting;

  // Subsurface glow at bright light levels
  float glow = smoothstep(0.55, 0.95, lightLevel);
  float multiplier = 1.5;
  vec3 subsurface = vec3(1.0, 0.78, 0.3) * glow * multiplier;
  litColor += subsurface;

  // Long strands get a base brightness boost so they never look darker than neighbors
  litColor *= 1.0 + longFactor * 0.6;

  float dist = length(vViewPos);
  float fogFactor = smoothstep(uFogStart, uFogEnd, dist);
  litColor = mix(litColor, uFogColor, fogFactor);

  // Hard cut at base — opaque or discarded, no blending noise
  float alpha = step(0.03, t);
  gl_FragColor = vec4(litColor, alpha);
}
