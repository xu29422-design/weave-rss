"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  varying vec2 vUv;

  // Optimized noise for performance
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0 * vec3(x0.x, x12.xz) + h * vec3(x0.y, x12.yw);
    vec3 norm = 1.79284291400159 - 0.85373472095314 * (g*g + h*h);
    vec3 contribution = 130.0 * m * (norm * g + h * a0);
    return contribution.x + contribution.y + contribution.z;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 2; i++) { // Reduced octaves from 4 to 2 for performance
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float time = uTime * 0.1;
    
    // --- Soft Mist Logic (Light Version of Enter Page) ---
    // Multi-layered noise for ethereal mist
    vec2 mistUv = p * 0.8;
    
    // Purple Layer (n1): Slender & Irregular (细长且不规律)
    // 1. Domain Warping for irregularity
    vec2 purpleUv = p;
    float warp = snoise(p * 1.5 - time * 0.15);
    purpleUv += warp * 0.4;
    // 2. Anisotropic scaling for slender/streaky look
    purpleUv.y *= 2.5; // Stretch in Y to create horizontal-ish thin lines
    purpleUv.x *= 0.8;
    
    float n1 = fbm(purpleUv + time * 0.2);
    // 3. Sharpen to make it thinner
    n1 = pow(n1 * 1.2, 3.0); 
    
    // Cyan Layer (n2): Soft & Flowing
    float n2 = fbm(mistUv - time * 0.15 + n1 * 0.5);
    
    // Mouse interaction
    float mouseDist = length(p - uMouse * 0.5);
    float mouseInfluence = smoothstep(0.6, 0.0, mouseDist);
    n2 += mouseInfluence * 0.2;
    // Disturb purple layer too
    n1 += mouseInfluence * 0.3 * snoise(p * 5.0);

    // --- Colors (Deep Dark / Black Theme) ---
    // 降低纯度，使背景不再是死黑，而是带有微妙的灰蓝色调
    vec3 baseBlack = vec3(0.05, 0.06, 0.11); // 提亮基底，使其更有质感
    vec3 mistPurple = vec3(0.35, 0.15, 0.65); // 暗夜紫罗兰
    vec3 mistCyan = vec3(0.1, 0.35, 0.65);    // 深海蓝
    
    // Blend mist layers (additive blending for glowing effect on dark bg)
    vec3 color = mix(baseBlack, mistPurple, n1 * 0.4); 
    color = mix(color, mistCyan, n2 * 0.35);
    
    // Add a moving gradient "Aurora" effect
    float aurora = snoise(p * 2.0 + vec2(time * 0.5, time * 0.2));
    vec3 auroraColor = vec3(0.15, 0.25, 0.75); // Midnight Blue
    color = mix(color, auroraColor, smoothstep(0.3, 0.8, aurora) * 0.3);
    
    // --- Orange Thin Lines (Energy Filaments) ---
    // 橙色细线条：加强版
    vec2 orangeUv = p;
    // 增加扭曲程度，让线条更灵动
    orangeUv += snoise(p * 2.0 - time * 0.1) * 0.3;
    // 调整拉伸比例，让线条更明显
    orangeUv.y *= 16.0; // 再次拉长，变细
    orangeUv.x *= 0.5;
    
    // 使用 FBM 生成纹理
    float n3 = fbm(orangeUv + time * 0.3);
    
    // 提高锐化阈值，让线条变细 (从 4.0 升到 10.0)
    float lineMask = max(0.0, n3);
    lineMask = pow(lineMask, 10.0); 
    
    vec3 orangeColor = vec3(1.0, 0.6, 0.1); // 更亮的橙色
    // 增加混合强度 (2.0 -> 4.0) 以补偿变细后的亮度损失，确保纤细但明亮
    color += orangeColor * lineMask * 4.0;
    
    // Vignette (Fade to Dark Blue-Grey instead of Pure Black)
    // 边缘压暗，但不完全压死，保留一点通透感
    float v = smoothstep(1.8, 0.4, length(p)); 
    color = mix(vec3(0.02, 0.02, 0.04), color, v);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function GlobalBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Disable antialias for performance
      alpha: false,
      powerPreference: "high-performance",
      precision: "mediump" // Use medium precision for better performance
    });
    renderer.setPixelRatio(1.0); // Limit pixel ratio to 1.0 for maximum performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      depthTest: false,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle mouse updates slightly if needed, but direct assignment is usually fast enough.
      // Just ensure we don't do heavy calc here.
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = (time: number) => {
      material.uniforms.uTime.value = time * 0.001;
      material.uniforms.uMouse.value.lerp(mouseRef.current, 0.05); 
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-black"
    >
      {/* 移除蒙层，直接显示 Canvas 以确保可见性 */}
    </div>
  );
}
