import { useEffect, useRef } from "react";

export default function MatrixRain({ opacity = 0.04 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const cols = Math.floor(W / 16);
    const drops = Array(cols).fill(1);
    const chars = "アイウエオカキクケコ01ABCDEF⬡∴∵⊕⊗";
    let raf;
    function draw() {
      ctx.fillStyle = `rgba(5,5,8,0.06)`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,215,0,${opacity})`;
      ctx.font = "13px monospace";
      for (let i = 0; i < drops.length; i++) {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
        if (drops[i] * 16 > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [opacity]);
  return <canvas ref={ref} style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 0, opacity }} />;
}
