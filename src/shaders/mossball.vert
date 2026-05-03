// Made by Hieu Le — leduchieu.com

uniform float uTime;
uniform float uWindSpeed;
uniform float uWindAmplitude;
uniform float uLengthMultiplier;
uniform float uClumpStrength;
uniform float uMotionClumpBoost;

attribute vec3 aBasePos;
attribute vec3 aNormal;
attribute vec3 aTangent;
attribute vec3 aBitangent;
attribute vec2 aBendState;
attribute float aHeightScale;
attribute float aLengthScale;

varying float vHeight;
varying vec3 vViewPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vLengthScale;

void main() {
  vec3 pos = position;
  float t = uv.y;
  vHeight = t;

  float taper = 1.0 - t * 0.82;
  pos.x *= taper;
  pos.z *= taper;

  pos.y *= aHeightScale * aLengthScale * uLengthMultiplier;

  // Long strands are thinner
  float strandThin = 0.5 - smoothstep(1.5, 3.5, aLengthScale * uLengthMultiplier) * 0.7;
  pos.x *= strandThin;
  pos.z *= strandThin;

  float w1 = sin(aBasePos.x * 2.0 + aBasePos.y * 1.5 + uTime * uWindSpeed);
  float w2 = cos(aBasePos.z * 1.8 + uTime * uWindSpeed * 0.7);
  float windX = (w1 + w2) * uWindAmplitude * 0.5;
  float windZ = (w1 - w2) * uWindAmplitude * 0.3;

  float bendFactor = pow(t, 1.8);

  // Clumping: nearby strands lean in similar directions
  float totalClump = uClumpStrength + uMotionClumpBoost;
  float clumpX = sin(aBasePos.x * 4.0 + aBasePos.z * 2.0) * totalClump;
  float clumpZ = cos(aBasePos.z * 4.0 + aBasePos.x * 2.0) * totalClump;

  float dx = (aBendState.x + windX + clumpX) * bendFactor;
  float dz = (aBendState.y + windZ + clumpZ) * bendFactor;

  float origLenSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
  float newX = pos.x + dx;
  float newZ = pos.z + dz;
  float newLenSq = newX * newX + pos.y * pos.y + newZ * newZ;
  float lenScale = sqrt(origLenSq / max(newLenSq, 0.0001));
  pos.x = newX * lenScale;
  pos.y = pos.y * lenScale;
  pos.z = newZ * lenScale;

  vec3 orientedPos = aTangent * pos.x + aNormal * pos.y + aBitangent * pos.z;
  vec3 worldPos = aBasePos + orientedPos;
  vWorldPos = worldPos;
  vNormal = normalize((modelMatrix * vec4(aNormal, 0.0)).xyz);
  vLengthScale = aLengthScale;

  vec4 viewPos = modelViewMatrix * vec4(worldPos, 1.0);
  vViewPos = viewPos.xyz;
  gl_Position = projectionMatrix * viewPos;
}
