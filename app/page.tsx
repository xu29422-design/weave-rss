"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// Shader for the cloud particles
// 使用程序化生成的噪声云纹理，彻底消除“方块”边缘
const cloudVertexShader = `
  varying vec2 vUv;
  varying float vFogDepth;
  
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vFogDepth = -mvPosition.z;
  }
`;

const cloudFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFogDepth;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uFogColor;

  // Simple pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Center coordinates
    vec2 center = vUv - 0.5;
    float dist = length(center);
    
    // 1. Circular mask (Soft edges) - 核心修复：强制圆形衰减，消除方块
    float circle = 1.0 - smoothstep(0.2, 0.5, dist);
    
    // 2. Cloud noise shape
    // Rotate noise over time for internal movement
    float n = fbm(vUv * 3.0 + uTime * 0.1);
    
    // Combine mask and noise
    float alpha = circle * (n * 0.5 + 0.5);
    
    // Cutoff very low alpha to ensure transparency
    alpha = smoothstep(0.1, 1.0, alpha);
    
    // Fog calculation inside shader for better blending
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    vec3 finalColor = mix(uColor, uFogColor, fogFactor);
    
    // Fade out alpha with fog too
    alpha *= (1.0 - fogFactor * 0.8);

    gl_FragColor = vec4(finalColor, alpha * 0.6); // Base opacity
  }
`;

export default function EnterPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Init Scene
    const scene = new THREE.Scene();
    // 调整为更中性深邃的背景色：Deep Dark
    const bgColor = new THREE.Color("#000510"); 
    scene.background = bgColor;
    // Fog is handled manually in shader for clouds, but added here for other objects if any
    scene.fog = new THREE.Fog(bgColor.getHex(), 100, 2000);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: "high-performance",
      alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 2. Create Clouds
    const cloudCount = 60;
    const geometry = new THREE.PlaneGeometry(400, 400);
    const material = new THREE.ShaderMaterial({
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#60a5fa") }, // blue-400
        uFogNear: { value: 100 },
        uFogFar: { value: 1800 },
        uFogColor: { value: bgColor }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending, // 使用 NormalBlending 避免过度曝光，更像实体云
      side: THREE.DoubleSide
    });

    const clouds: THREE.Mesh[] = [];
    
    // Create a tunnel of clouds
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Mesh(geometry, material.clone());
      
      // Random position in a tunnel shape
      const angle = Math.random() * Math.PI * 2;
      const radius = 200 + Math.random() * 400; // Tunnel radius
      
      cloud.position.x = Math.cos(angle) * radius;
      cloud.position.y = Math.sin(angle) * radius;
      cloud.position.z = i * 40 - 1000; // Spread along Z
      
      // Random rotation
      cloud.rotation.z = Math.random() * Math.PI * 2;
      
      // Random scale
      const scale = 1 + Math.random();
      cloud.scale.set(scale, scale, 1);
      
      // Look at camera (billboard effect) but keep Z rotation
      // Actually for tunnel effect, we might want them facing center or camera.
      // Let's make them face camera initially but then apply z rotation
      cloud.lookAt(0, 0, 10000); // Face roughly towards camera end
      
      // Store random speed
      cloud.userData = {
        rotateSpeed: (Math.random() - 0.5) * 0.002,
        zSpeed: 2 + Math.random() * 2
      };

      // Randomize color slightly
      const variant = Math.random();
      if (variant > 0.6) {
        (cloud.material as THREE.ShaderMaterial).uniforms.uColor.value = new THREE.Color("#d8b4fe"); // purple-300 (淡紫色)
      } else if (variant > 0.3) {
        (cloud.material as THREE.ShaderMaterial).uniforms.uColor.value = new THREE.Color("#22d3ee"); // cyan-400 (青色)
      } else {
        (cloud.material as THREE.ShaderMaterial).uniforms.uColor.value = new THREE.Color("#f8fafc"); // slate-50 (白雾色)
      }

      scene.add(cloud);
      clouds.push(cloud);
    }

    // 3. Interaction State
    let mouseX = 0;
    let mouseY = 0;
    let scrollSpeed = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
    };

    const handleWheel = (e: WheelEvent) => {
      // Scroll increases forward speed
      scrollSpeed += e.deltaY * 0.05;
      scrollSpeed = Math.min(Math.max(scrollSpeed, 0), 50); // Cap speed
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel);

    // 4. Animation Loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Decay scroll speed
      scrollSpeed *= 0.95;
      const currentSpeed = 20 + scrollSpeed; // Base speed + scroll boost

      // Animate Clouds
      clouds.forEach(cloud => {
        const mat = cloud.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = time;
        
        // Move towards camera
        cloud.position.z += currentSpeed * delta * 5;
        
        // Rotate
        cloud.rotation.z += cloud.userData.rotateSpeed;

        // Reset if passed camera
        if (cloud.position.z > camera.position.z + 200) {
          cloud.position.z = -1500;
          // Randomize xy again
          const angle = Math.random() * Math.PI * 2;
          const radius = 200 + Math.random() * 400;
          cloud.position.x = Math.cos(angle) * radius;
          cloud.position.y = Math.sin(angle) * radius;
        }
      });

      // Camera gentle float
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Loading Simulation
    const timer = setInterval(() => {
      setProgress(old => {
        if (old >= 100) {
          clearInterval(timer);
          setLoading(false);
          return 100;
        }
        return old + 2;
      });
    }, 20);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 z-0" />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none">
        <AnimatePresence>
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5 }}
              className="text-center"
            >
              <h1 className="text-7xl md:text-9xl font-serif font-bold text-white tracking-tighter mb-4 mix-blend-overlay opacity-80 italic relative">
                <span className="relative z-10">Weave</span>
                <span className="absolute inset-0 text-cyan-400 blur-[2px] translate-x-[2px] opacity-30">Weave</span>
                <span className="absolute inset-0 text-blue-600 blur-[2px] -translate-x-[2px] opacity-30">Weave</span>
              </h1>
              <p className="text-blue-200/80 text-xs tracking-[0.5em] uppercase mb-12">
                信息的迷雾，令人惘然；众人所盼，一面出口
              </p>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => router.push("/home")}
                className="pointer-events-auto px-8 py-3 border border-white/20 rounded-full text-white hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm text-lg tracking-widest font-serif"
                style={{ fontFamily: 'SimSun, STSong, "Songti SC", serif' }}
              >
                进入
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#000510]"
          >
            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Scroll Hint */}
      {!loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-widest uppercase"
        >
          Scroll to Fly
        </motion.div>
      )}
    </div>
  );
}
