import React, { useEffect, useRef, useState } from 'react';
import './P2PNetwork.css';

const P2PNetwork = () => {
  const canvasRef = useRef(null);
  const [activeCount, setActiveCount] = useState(0);
  
  // Ref to store the spawner function so we can call it from the React onClick handler
  const spawnRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;
    let resizeTimeout;

    // --- CONFIG ---
    const CFG = {
      NODE_COUNT: 135,
      NODE_RADIUS_MIN: 1.8,
      NODE_RADIUS_MAX: 4.2,
      CONNECT_DIST: 140,
      BASE_SPEED: 0.15,
      SLOWED_SPEED: 0.05,
      EDGE_ALPHA: 0.12,
      EDGE_WIDTH: 1.0,
      NODE_GLOW_BLUR: 20,
      TRANSFER_MIN_INTERVAL: 1800,
      TRANSFER_MAX_INTERVAL: 4200,
      TRANSFER_SEGMENT_MS: 300,
      CLUSTER_PARTICLES_MIN: 6,
      CLUSTER_PARTICLES_MAX: 15,
      CLUSTER_PARTICLE_RADIUS: 1.5,
      MAX_ACTIVE_TRANSFERS: 5,
      MAX_PATH_HOPS: 28
    };

    // --- GLOBALS WITHIN CLOSURE ---
    let width = window.innerWidth;
    let height = window.innerHeight;
    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    
    let nodes = [];
    let adjacency = [];
    let transfers = [];
    let frameCount = 0;
    
    // --- UTILITIES ---
    const rand = (a, b) => Math.random() * (b - a) + a;
    const randInt = (a, b) => Math.floor(rand(a, b + 1));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const distSq = (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    // --- CLASSES ---
    class Node {
      constructor(i) {
        this.i = i;
        this.x = rand(40, width - 40);
        this.y = rand(40, height - 40);
        this.vx = rand(-1, 1);
        this.vy = rand(-1, 1);
        this.r = rand(CFG.NODE_RADIUS_MIN, CFG.NODE_RADIUS_MAX);
        this.glow = 0;
      }
      update(speedFactor) {
        this.x += this.vx * speedFactor;
        this.y += this.vy * speedFactor;

        // Bounce
        if (this.x < 6) { this.x = 6; this.vx = Math.abs(this.vx); }
        if (this.x > width - 6) { this.x = width - 6; this.vx = -Math.abs(this.vx); }
        if (this.y < 6) { this.y = 6; this.vy = Math.abs(this.vy); }
        if (this.y > height - 6) { this.y = height - 6; this.vy = -Math.abs(this.vy); }

        // Random drift
        if (Math.random() < 0.004) {
          this.vx += rand(-0.25, 0.25);
          this.vy += rand(-0.25, 0.25);
          this.vx = clamp(this.vx, -1.2, 1.2);
          this.vy = clamp(this.vy, -1.2, 1.2);
        }

        // Glow decay
        this.glow = Math.max(0, this.glow - 0.012);
      }
      draw(ctx) {
        if (this.glow > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.shadowBlur = CFG.NODE_GLOW_BLUR * (0.8 + this.glow * 0.6);
          ctx.shadowColor = `rgba(200,240,255,${0.28 * this.glow})`;
          ctx.fillStyle = `rgba(220,245,255,${0.04 + 0.28 * this.glow})`;
          ctx.arc(this.x, this.y, this.r * (1.9 + this.glow * 1.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Transfer {
      constructor(pathIndices) {
        this.path = pathIndices;
        this.currentSegment = 0;
        this.t = 0;
        this.segmentBaseMs = CFG.TRANSFER_SEGMENT_MS;
        const pcount = randInt(CFG.CLUSTER_PARTICLES_MIN, CFG.CLUSTER_PARTICLES_MAX);
        this.particles = Array.from({ length: pcount }, () => ({
          ox: rand(-8, 8),
          oy: rand(-6, 6),
          r: rand(0.8, CFG.CLUSTER_PARTICLE_RADIUS)
        }));
        // Glow start/end
        if (nodes[this.path[0]]) nodes[this.path[0]].glow = 1.0;
        if (nodes[this.path[this.path.length - 1]]) nodes[this.path[this.path.length - 1]].glow = 1.0;
        this.finished = false;
      }

      segmentDurationMs(aIdx, bIdx) {
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) return this.segmentBaseMs;
        const d = dist(a, b);
        const scale = clamp(d / CFG.CONNECT_DIST, 0.5, 1.8);
        return this.segmentBaseMs * scale;
      }

      update(dtMs) {
        if (this.finished) return;
        const segIdx = this.currentSegment;
        const aIdx = this.path[segIdx];
        const bIdx = this.path[segIdx + 1];
        
        if (aIdx === undefined || bIdx === undefined) {
          this.finish();
          return;
        }
        const segMs = this.segmentDurationMs(aIdx, bIdx);
        this.t += dtMs / segMs;
        if (this.t >= 1) {
          this.t = 0;
          this.currentSegment++;
          if (this.currentSegment >= this.path.length - 1) {
            this.finish();
          }
        }
      }

      draw(ctx) {
        if (this.finished) return;
        const aIdx = this.path[this.currentSegment];
        const bIdx = this.path[this.currentSegment + 1];
        if (aIdx === undefined || bIdx === undefined) return;
        
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        const cx = a.x + (b.x - a.x) * this.t;
        const cy = a.y + (b.y - a.y) * this.t;

        // Path overlay
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(200,240,255,0.06)';
        ctx.beginPath();
        for (let i = 0; i < this.path.length - 1; i++) {
          const n1 = nodes[this.path[i]];
          const n2 = nodes[this.path[i + 1]];
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
        }
        ctx.stroke();
        ctx.restore();

        // Cluster Halo
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(200,240,255,0.08)';
        ctx.fillStyle = 'rgba(240,250,255,0.02)';
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Particles
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        
        for (const p of this.particles) {
          const jitter = (Math.random() - 0.5) * 0.8;
          const px = cx + p.ox + nx * (p.oy * 0.4) + nx * jitter;
          const py = cy + p.oy + ny * (p.oy * 0.4) + ny * jitter;
          ctx.beginPath();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      finish() {
        const lastIdx = this.path[this.path.length - 1];
        if (nodes[lastIdx]) {
           nodes[lastIdx].glow = Math.max(nodes[lastIdx].glow, 1.0);
        }
        this.finished = true;
      }
    }

    // --- CORE LOGIC ---

    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * DPR);
      canvas.height = Math.round(height * DPR);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const rebuildAdjacency = () => {
      adjacency = Array.from({ length: nodes.length }, () => []);
      const maxDist = CFG.CONNECT_DIST;
      const maxSq = maxDist * maxDist;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d2 = distSq(a, b);
          if (d2 <= maxSq) {
            adjacency[i].push(j);
            adjacency[j].push(i);
          }
        }
      }
    };

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < CFG.NODE_COUNT; i++) {
        nodes.push(new Node(i));
      }
      rebuildAdjacency();
    };

    const findPathBFS = (srcIdx, dstIdx) => {
      if (srcIdx === dstIdx) return [srcIdx];
      const q = [srcIdx];
      const prev = new Array(nodes.length).fill(-1);
      prev[srcIdx] = srcIdx;
      let found = false;
      
      let head = 0;
      while (head < q.length) {
        const cur = q[head++];
        const neighbors = adjacency[cur];
        for (const nb of neighbors) {
          if (prev[nb] !== -1) continue;
          prev[nb] = cur;
          if (nb === dstIdx) {
            found = true; 
            break;
          }
          q.push(nb);
        }
        if (found) break;
        if (q.length > nodes.length * 2) break;
      }

      if (!found) return null;

      const path = [];
      let cur = dstIdx;
      let steps = 0;
      while (cur !== prev[cur] && steps++ < nodes.length + 4) {
        path.push(cur);
        cur = prev[cur];
      }
      path.push(srcIdx);
      path.reverse();
      if (path.length > CFG.MAX_PATH_HOPS) return null;
      return path;
    };

    const spawnTransfer = (auto = false) => {
      if (transfers.length >= CFG.MAX_ACTIVE_TRANSFERS) return null;
      
      let src = randInt(0, nodes.length - 1);
      let dst = randInt(0, nodes.length - 1);
      let attempts = 0;
      while (dst === src && attempts++ < 8) dst = randInt(0, nodes.length - 1);

      for (let tries = 0; tries < 6; tries++) {
        const path = findPathBFS(src, dst);
        if (path && path.length >= 2) {
          const tr = new Transfer(path);
          transfers.push(tr);
          setActiveCount(transfers.length); // Update React State
          return tr;
        }
        dst = randInt(0, nodes.length - 1);
      }
      return null;
    };

    // Expose spawn function to component scope for onClick
    spawnRef.current = () => spawnTransfer(false);

    const clearFinished = () => {
      const before = transfers.length;
      transfers = transfers.filter(t => !t.finished);
      if (transfers.length !== before) {
          setActiveCount(transfers.length); // Update React State
      }
    };

    const drawEdges = (ctx) => {
      ctx.save();
      ctx.lineWidth = CFG.EDGE_WIDTH;
      ctx.strokeStyle = `rgba(200,230,255,${CFG.EDGE_ALPHA})`;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const neigh = adjacency[i];
        for (const j of neigh) {
          if (j <= i) continue;
          const b = nodes[j];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Background
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, 'rgba(6,8,12,0.12)');
      g.addColorStop(1, 'rgba(2,3,6,0.30)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      drawEdges(ctx);

      // Halos
      for (const n of nodes) {
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(200,240,255,0.03)';
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.arc(n.x, n.y, n.r * 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const t of transfers) t.draw(ctx);
      for (const n of nodes) n.draw(ctx);
    };

    let lastTs = performance.now();
    const tick = (ts) => {
      const dt = ts - lastTs;
      lastTs = ts;

      const slow = transfers.length > 0;
      const nodeSpeed = slow ? CFG.SLOWED_SPEED : CFG.BASE_SPEED;
      const rebuildEvery = Math.max(6, Math.floor(2000 / (CFG.NODE_COUNT || 40)));

      frameCount++;
      if (frameCount % rebuildEvery === 0) rebuildAdjacency();

      for (const n of nodes) n.update(nodeSpeed * (dt * 0.06));
      for (const t of transfers) t.update(dt);

      render();
      clearFinished();
      animationFrameId = requestAnimationFrame(tick);
    };

    // Auto Spawner
    let autoSpawnerTimeout;
    const autoSpawner = () => {
      const min = CFG.TRANSFER_MIN_INTERVAL;
      const max = CFG.TRANSFER_MAX_INTERVAL;
      const delay = rand(min, max);
      autoSpawnerTimeout = setTimeout(() => {
        if (Math.random() < 0.75) spawnTransfer(true);
        else { spawnTransfer(true); spawnTransfer(true); }
        autoSpawner();
      }, delay);
    };

    // --- INITIALIZATION ---
    resize();
    initNodes();
    
    // Check reduced motion
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      animationFrameId = requestAnimationFrame(tick);
      autoSpawner();
    } else {
      render();
    }

    // Window Listeners
    const handleResize = () => {
      resize();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        rebuildAdjacency();
      }, 220);
    };

    window.addEventListener('resize', handleResize);

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(autoSpawnerTimeout);
      clearTimeout(resizeTimeout);
    };
  }, []); // Empty dependency array = run once on mount

  // Handler using the ref
  const handleCanvasClick = () => {
    if (spawnRef.current) spawnRef.current();
  };

  return (
    <div className="p2p-container">
      <canvas 
        ref={canvasRef} 
        className="p2p-canvas"
        onClick={handleCanvasClick}
      />
      <div className="overlay">
        Active transfers: <span id="activeCount">{activeCount}</span>
      </div>
      <div className="hint">
        Click anywhere to spawn a transfer • Transfers travel only along network lines
      </div>
    </div>
  );
};

export default P2PNetwork;