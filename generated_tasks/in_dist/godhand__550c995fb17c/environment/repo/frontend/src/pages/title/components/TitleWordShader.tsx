import { useEffect, useRef, useState } from 'react'

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
uniform sampler2D u_mask;
uniform float u_ring_strength;
varying vec2 v_uv;

float random(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

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
  mat2 rot = mat2(cos(0.45), sin(0.45), -sin(0.45), cos(0.45));
  for (int i = 0; i < NUM_OCTAVES; i++) {
    value += amplitude * noise(p);
    p = rot * p * 2.0 + shift;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  float mask = texture2D(u_mask, vec2(v_uv.x, 1.0 - v_uv.y)).a;
  if (mask <= 0.001) {
    discard;
  }

  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float t = u_time * 0.32;
  vec2 st = p * 2.9;

  vec2 q = vec2(
    fbm(st + vec2(t, 0.0)),
    fbm(st + vec2(1.0, -t))
  );

  vec2 r = vec2(
    fbm(st + 1.3 * q + vec2(1.7, 9.2) + 0.2 * t),
    fbm(st + 1.3 * q + vec2(8.3, 2.8) - 0.15 * t)
  );

  float f = fbm(st + 1.1 * r);

  vec3 deep = vec3(0.025, 0.19, 0.22);
  vec3 mint = vec3(0.48, 0.96, 0.88);
  vec3 gold = vec3(0.95, 0.78, 0.41);
  vec3 ivory = vec3(0.94, 0.99, 0.94);

  float core = smoothstep(0.12, 0.9, f);
  float warm = smoothstep(0.38, 0.96, r.x);
  vec3 color = mix(deep, mint, core);
  color = mix(color, gold, warm * 0.62);

  float centerGlow = pow(max(0.0, 1.0 - length(p * vec2(0.86, 1.0))), 2.3);
  color += ivory * centerGlow * 0.2;

  float ring = exp(-90.0 * abs(length(p + vec2(0.05, sin(t) * 0.03)) - (0.58 + 0.03 * sin(t * 0.8))));
  color += vec3(0.2, 0.42, 0.4) * ring * u_ring_strength;

  float glintAxis = p.x - p.y * 0.24 + sin(t * 0.55) * 0.38;
  float glintBand = smoothstep(-0.07, 0.0, glintAxis) - smoothstep(0.0, 0.07, glintAxis);
  float glintTexture = 0.65 + 0.35 * sin((p.x * 22.0 + p.y * 7.0) - t * 5.6);
  color += ivory * glintBand * glintTexture * 0.32;

  vec2 starUv = floor((p + t * 0.02) * 52.0);
  float starSeed = random(starUv);
  float star = step(0.9965, starSeed) * (0.7 + 0.3 * sin(u_time * 2.0 + starSeed * 23.0));
  color += ivory * star * 0.18;

  float pulse = 0.9 + 0.1 * sin(t * 2.3 + f * 5.0);
  color *= pulse;

  float edge = smoothstep(0.0, 1.0, mask);
  color *= 0.8 + edge * 0.2;

  gl_FragColor = vec4(color, mask);
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
  gl.deleteProgram(program)
  return null
}

type TitleWordShaderProps = {
  text: string
  className?: string
  showRing?: boolean
}

export default function TitleWordShader({ text, className, showRing = true }: TitleWordShaderProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [shaderReady, setShaderReady] = useState(false)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const measure = measureRef.current
    const canvas = canvasRef.current
    if (!wrapper || !measure || !canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    })
    if (!gl) {
      setShaderReady(false)
      return
    }

    const program = createProgram(gl)
    if (!program) {
      setShaderReady(false)
      return
    }

    const positionBuffer = gl.createBuffer()
    const maskTexture = gl.createTexture()
    if (!positionBuffer || !maskTexture) {
      gl.deleteBuffer(positionBuffer)
      gl.deleteTexture(maskTexture)
      gl.deleteProgram(program)
      setShaderReady(false)
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

    gl.bindTexture(gl.TEXTURE_2D, maskTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const maskLocation = gl.getUniformLocation(program, 'u_mask')
    const ringStrengthLocation = gl.getUniformLocation(program, 'u_ring_strength')
    if (
      positionLocation < 0 ||
      !timeLocation ||
      !resolutionLocation ||
      !maskLocation ||
      !ringStrengthLocation
    ) {
      gl.deleteBuffer(positionBuffer)
      gl.deleteTexture(maskTexture)
      gl.deleteProgram(program)
      setShaderReady(false)
      return
    }

    const textMaskCanvas = document.createElement('canvas')
    const textMaskContext = textMaskCanvas.getContext('2d')
    if (!textMaskContext) {
      gl.deleteBuffer(positionBuffer)
      gl.deleteTexture(maskTexture)
      gl.deleteProgram(program)
      setShaderReady(false)
      return
    }

    let disposed = false

    const resizeAndUploadMask = () => {
      if (disposed || !gl.isTexture(maskTexture)) return
      const rect = wrapper.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)

      textMaskCanvas.width = width
      textMaskCanvas.height = height
      textMaskContext.clearRect(0, 0, width, height)

      const style = window.getComputedStyle(measure)
      const fontSizePx = Math.max(1, Number.parseFloat(style.fontSize) * dpr)
      textMaskContext.font = `${style.fontWeight} ${fontSizePx}px ${style.fontFamily}`
      textMaskContext.textAlign = 'center'
      textMaskContext.textBaseline = 'alphabetic'
      textMaskContext.fillStyle = '#ffffff'

      const metrics = textMaskContext.measureText(text)
      const ascent = metrics.actualBoundingBoxAscent || fontSizePx * 0.74
      const descent = metrics.actualBoundingBoxDescent || fontSizePx * 0.26
      const y = (height - (ascent + descent)) * 0.5 + ascent
      textMaskContext.fillText(text, width * 0.5, y)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, maskTexture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textMaskCanvas)
    }

    let rafId: number | null = null
    const render = (timeMs: number) => {
      if (disposed || !gl.isTexture(maskTexture)) return
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, maskTexture)
      gl.uniform1i(maskLocation, 0)
      gl.uniform1f(timeLocation, timeMs * 0.001)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(ringStrengthLocation, showRing ? 1.0 : 0.0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      rafId = requestAnimationFrame(render)
    }

    resizeAndUploadMask()
    setShaderReady(true)

    const resizeObserver = new ResizeObserver(() => {
      resizeAndUploadMask()
    })
    resizeObserver.observe(wrapper)

    if ('fonts' in document) {
      void document.fonts.ready.then(() => {
        if (disposed) return
        resizeAndUploadMask()
      })
    }

    rafId = requestAnimationFrame(render)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
      gl.deleteBuffer(positionBuffer)
      gl.deleteTexture(maskTexture)
      gl.deleteProgram(program)
    }
  }, [showRing, text])

  return (
    <span ref={wrapperRef} className={`title-webgl-word ${className ?? ''}`} aria-label={text}>
      <span ref={measureRef} className="title-webgl-word-measure" aria-hidden>
        {text}
      </span>
      <canvas ref={canvasRef} className="title-webgl-word-canvas" aria-hidden />
      {!shaderReady ? (
        <span className="title-webgl-word-fallback" aria-hidden>
          {text}
        </span>
      ) : null}
    </span>
  )
}
