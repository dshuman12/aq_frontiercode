import { useEffect, useRef } from 'react'

// this shader heavily references these examples for the hash/noise/fbm approach:
// random hash and 2d noise: https://thebookofshaders.com/11/
// fbm noise: https://thebookofshaders.com/13/
// gradient noise: https://iquilezles.org/articles/gradientnoise/
const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_uv;


// random function
float random(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 5

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  vec2 shift = vec2(100.0);
  // rotate to reduce axial bias
  // source: https://www.shadertoy.com/view/4dS3Wd
  mat2 rot = mat2(cos(0.5), sin(0.5),
                  -sin(0.5), cos(0.5));

  for (int i = 0; i < NUM_OCTAVES; i++) {
    value += amplitude * noise(p);
    p = rot * p * 2.0 + shift;
    amplitude *= 0.5;
  }
  return value;
}

float ring(vec2 p, float radius, float width) {
  float d = abs(length(p) - radius);
  return smoothstep(width, 0.0, d);
}

float streakStarLayer(vec2 p, float t) {
  vec2 driftUv = p * 58.0 + vec2(t * 0.85, -t * 0.35);
  vec2 cell = floor(driftUv);
  vec2 local = fract(driftUv);
  float seed = random(cell + vec2(41.2, 17.9));
  float hasStar = step(0.9988, seed);

  vec2 offset = vec2(
    random(cell + vec2(13.6, 2.4)),
    random(cell + vec2(4.9, 10.1))
  );

  vec2 delta = local - offset;
  float streak = smoothstep(0.03, 0.0, abs(delta.y)) * smoothstep(0.095, 0.0, abs(delta.x));
  streak = pow(streak, 1.8);
  float flicker = 0.65 + 0.35 * sin(t * 1.1 + seed * 18.0);

  return hasStar * streak * flicker;
}

float cometLayer(vec2 p, float t) {
  float sum = 0.0;
  vec2 screenHalf = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float seed = fi * 37.173 + 4.0;
    float phase = fract(t * (0.028 + random(vec2(seed, 1.7)) * 0.016) + random(vec2(seed, 8.9)));

    float appear = smoothstep(0.72, 0.76, phase);
    float alive = appear;

    float lane = mix(-0.8, 0.95, random(vec2(seed, 3.2)));
    vec2 start = vec2(-(screenHalf.x + 0.24), lane + 0.28);
    vec2 end = vec2(screenHalf.x + 0.24, lane - 1.02);
    float travel = clamp((phase - 0.72) / 0.28, 0.0, 1.0);
    vec2 head = mix(start, end, travel);

    vec2 dir = normalize(end - start);
    vec2 perp = vec2(-dir.y, dir.x);
    vec2 delta = p - head;
    float along = dot(delta, dir);
    float across = abs(dot(delta, perp));

    float headGlow = pow(smoothstep(0.014, 0.0, length(delta)), 1.4);
    float tail = smoothstep(0.018, 0.0, across) * smoothstep(-0.22, -0.008, along) * step(along, 0.0);
    float sparkle = 0.9 + 0.1 * sin(t * 8.0 + seed * 20.0);
    vec2 overflow = max(abs(head) - screenHalf, vec2(0.0));
    float outside = length(overflow);
    float offscreenFade = 1.0 - smoothstep(0.0, 0.26, outside);

    sum += alive * offscreenFade * sparkle * (headGlow + tail * 0.45);
  }

  return sum;
}

void main() {
  vec2 uv = v_uv;

  // convert uv [0,1] -> centered [-1,1], then correct for aspect ratio
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  // pretty much followed the book of shaders example on fbm
  float t = u_time * 0.08;
  vec2 st = p * 2.2;

  vec2 q = vec2(
    fbm(st + vec2(t, 0.0)),
    fbm(st + vec2(1.0, -t))
  );

  vec2 r = vec2(
    fbm(st + 1.4 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(st + 1.4 * q + vec2(8.3, 2.8) - 0.12 * t)
  );

  float f = fbm(st + 1.2 * r);

  // base palette
  vec3 deep = vec3(0.014, 0.046, 0.048); // dark blue
  vec3 mid = vec3(0.05, 0.11, 0.102); // medium blue
  vec3 bright = vec3(0.2, 0.345, 0.244); // bright blue

  vec3 fog = mix(deep, mid, smoothstep(0.08, 0.95, f));

  // non-linear density for wispy and dense parts
  float density = f * f * (0.9 + 0.7 * f);
  vec3 color = fog * (0.55 + density);

  // tweak these in-shader to control center circle appearance
  float brighten = 1.0;
  vec3 circleColor = vec3(0.05, 0.11, 0.1);
  // the center circle
  float centerGlow = pow(max(0.0, 1.0 - length(p * vec2(0.86, 1.0))), 2.1);
  color += circleColor * centerGlow * brighten;

  float orbital = ring(p + vec2(0.0, sin(t * 0.6) * 0.03), 0.48 + sin(t) * 0.02, 0.01);
  color += vec3(0.03, 0.08, 0.05) * orbital;

  // stars
  vec2 starUv = p * 52.0;
  vec2 starCell = floor(starUv);
  vec2 starLocal = fract(starUv);
  float starSeed = random(starCell);
  float hasStar = step(0.9925, starSeed);

  vec2 starOffset = vec2(
    random(starCell + vec2(11.3, 7.1)),
    random(starCell + vec2(3.7, 17.2))
  );

  float starDist = length(starLocal - starOffset);
  float star = hasStar * smoothstep(0.16, 0.0, starDist);

  float twinkle = 0.75 + 0.25 * sin(u_time * 0.7 + starSeed * 20.0);
  star *= twinkle;

  star *= (1.0 - clamp(density * 0.45, 0.0, 0.75));
  color += vec3(0.88, 0.95, 0.92) * star;

  // subtle star drift and comet streaks
  float driftingStars = streakStarLayer(p, u_time);
  driftingStars *= (1.0 - clamp(density * 0.35, 0.0, 0.7));
  color += vec3(0.58, 0.77, 0.67) * driftingStars * 0.34;

  float comets = cometLayer(p, u_time);
  comets *= (1.0 - clamp(density * 0.4, 0.0, 0.85));
  color += vec3(0.72, 0.96, 0.86) * comets * 0.22;

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  }
  const stage = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
  const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.'
  console.error(`[ShaderBackdrop] Failed to compile ${stage} shader:\n${info}`)
  console.error(`[ShaderBackdrop] ${stage} shader source:\n${source}`)
  gl.deleteShader(shader)
  return null
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program
  }
  const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.'
  console.error(`[ShaderBackdrop] Failed to link shader program:\n${info}`)

  gl.deleteProgram(program)
  return null
}

export default function ShaderBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return

    const program = createProgram(gl)
    if (!program) return

    const positionBuffer = gl.createBuffer()
    if (!positionBuffer) {
      gl.deleteProgram(program)
      return
    }

    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    if (positionLocation < 0 || !timeLocation || !resolutionLocation) {
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
      return
    }

    let rafId: number | null = null

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const render = (timeMs: number) => {
      resize()

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(timeLocation, timeMs * 0.001)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafId !== null) cancelAnimationFrame(rafId)
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} className="shader-backdrop" aria-hidden />
}
