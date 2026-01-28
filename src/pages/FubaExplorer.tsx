import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(MotionPathPlugin, Draggable);

interface CareerNode {
  id: string;
  label: string;
  x: number;
  y: number;
  connections: string[];
}

interface TreeNode {
  id: string;
  x: number;
  y: number;
  label: string;
  role: string;
}

const careerData: CareerNode[] = [
  { id: "start", label: "Estágio", x: 200, y: 2200, connections: ["jr1"] },
  { id: "jr1", label: "Júnior I", x: 600, y: 2000, connections: ["jr2", "qa_jr"] },
  { id: "jr2", label: "Júnior II", x: 900, y: 1800, connections: ["pl1"] },
  { id: "qa_jr", label: "QA Júnior", x: 600, y: 2300, connections: ["qa_pl"] },
  { id: "pl1", label: "Pleno I", x: 1300, y: 1500, connections: ["pl2", "pl3"] },
  { id: "pl2", label: "Pleno II", x: 1600, y: 1300, connections: ["sr1"] },
  { id: "pl3", label: "Pleno Analytics", x: 1500, y: 1700, connections: ["data_sr"] },
  { id: "qa_pl", label: "QA Pleno", x: 900, y: 2400, connections: ["qa_sr"] },
  { id: "sr1", label: "Sênior I", x: 2000, y: 1000, connections: ["sr2", "tech_lead"] },
  { id: "sr2", label: "Sênior II", x: 2300, y: 800, connections: ["princ"] },
  { id: "data_sr", label: "Data Sr.", x: 1900, y: 1800, connections: ["data_lead"] },
  { id: "qa_sr", label: "QA Sênior", x: 1200, y: 2500, connections: ["qa_lead"] },
  { id: "tech_lead", label: "Tech Lead", x: 2600, y: 600, connections: ["cto"] },
  { id: "princ", label: "Principal Eng.", x: 2800, y: 400, connections: [] },
  { id: "data_lead", label: "Data Lead", x: 2400, y: 1900, connections: [] },
  { id: "qa_lead", label: "QA Lead", x: 1600, y: 2600, connections: [] },
  { id: "cto", label: "CTO", x: 3200, y: 200, connections: [] }
];

const nodesMap: Record<string, CareerNode> = {};
careerData.forEach(n => nodesMap[n.id] = n);

const obstacleEmojis = ['🦴', '🌳', '💧', '⭐', '🏆'];
const confettiEmojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'];

function generateCrazyLoop(x1: number, y1: number, x2: number, y2: number): string {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const offset = dist * 0.5;
  return `M${x1},${y1} C${x1 + Math.cos(angle + 1.6) * offset},${y1 + Math.sin(angle + 1.6) * offset} ${x2 + Math.cos(angle - 1.6) * offset},${y2 + Math.sin(angle - 1.6) * offset} ${x2},${y2}`;
}

export default function FubaExplorer() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bgParallaxRef = useRef<HTMLDivElement>(null);
  const mainGroupRef = useRef<SVGGElement>(null);
  const yGroupRef = useRef<SVGGElement>(null);
  const pathsLayerRef = useRef<SVGGElement>(null);
  const nodesLayerRef = useRef<SVGGElement>(null);
  const decoLayerRef = useRef<SVGGElement>(null);
  const pawsLayerRef = useRef<SVGGElement>(null);
  const obstaclesLayerRef = useRef<SVGGElement>(null);
  const activePathRef = useRef<SVGPathElement>(null);
  const previewPathRef = useRef<SVGPathElement>(null);
  const maskRevealPathRef = useRef<SVGPathElement>(null);
  const fubaRef = useRef<SVGForeignObjectElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uiHeaderRef = useRef<HTMLDivElement>(null);
  const barkSoundRef = useRef<HTMLAudioElement>(null);

  const [selectedDestino, setSelectedDestino] = useState(0);
  const [panelData, setPanelData] = useState({ title: '', badge: '', desc: '', showContent: false });
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const currentScaleRef = useRef(1);
  const isSubLevelOpenRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const lastFubaXRef = useRef(0);
  const pawPrintCounterRef = useRef(0);
  const PANEL_WIDTH = 450;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bgParallax = bgParallaxRef.current;
    const mainGroup = mainGroupRef.current;
    const pathsLayer = pathsLayerRef.current;
    const nodesLayer = nodesLayerRef.current;
    const decoLayer = decoLayerRef.current;
    const obstaclesLayer = obstaclesLayerRef.current;
    const fuba = fubaRef.current;

    if (!wrapper || !bgParallax || !mainGroup || !pathsLayer || !nodesLayer || !decoLayer || !obstaclesLayer || !fuba) return;

    // Create obstacles
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 3200 + 200;
      const y = Math.random() * 2200 + 200;
      const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y));
      text.setAttribute("class", "obstacle");
      text.textContent = emoji;
      obstaclesLayer.appendChild(text);
    }

    // Render nodes and paths
    careerData.forEach((data, index) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node-group");
      g.setAttribute("transform", `translate(${data.x}, ${data.y})`);
      g.addEventListener("mousedown", (e) => e.stopPropagation());
      g.addEventListener("click", (e) => { e.stopPropagation(); iniciarNavegacao(index); });

      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "14");
      c.setAttribute("class", "node-point");
      g.appendChild(c);
      nodesLayer.appendChild(g);

      data.connections.forEach(targetId => {
        const target = nodesMap[targetId];
        if (target) {
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const d = generateCrazyLoop(data.x, data.y, target.x, target.y);
          pathEl.setAttribute("d", d);
          pathEl.setAttribute("class", "path-static");
          pathsLayer.appendChild(pathEl);

          const len = pathEl.getTotalLength();
          const numDots = Math.floor(Math.random() * 2) + 1;
          for (let j = 0; j < numDots; j++) {
            const pt = pathEl.getPointAtLength(Math.random() * len);
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", String(pt.x));
            dot.setAttribute("cy", String(pt.y));
            dot.setAttribute("r", "4");
            dot.setAttribute("class", "deco-dot");
            decoLayer.appendChild(dot);
          }
        }
      });
    });

    // Set initial Fuba position with -35 offset (foreignObject anchor is top-left, not center)
    const startNode = careerData[0];
    gsap.set(fuba, { x: startNode.x - 35, y: startNode.y - 35 });
    lastFubaXRef.current = startNode.x;
    centerCamera(startNode.x, startNode.y, 0);

    // Draggable
    Draggable.create(wrapper, {
      type: "x,y",
      inertia: true,
      onDrag: updateParallax,
      onThrowUpdate: updateParallax
    });

    // Zoom
    const handleWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('#side-panel')) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      currentScaleRef.current = Math.min(Math.max(0.4, currentScaleRef.current + delta), 1.6);
      gsap.to(wrapper, { scale: currentScaleRef.current, duration: 0.3, overwrite: true, onUpdate: updateParallax });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const updateParallax = () => {
    const wrapper = wrapperRef.current;
    const bgParallax = bgParallaxRef.current;
    if (!wrapper || !bgParallax) return;

    const mapX = gsap.getProperty(wrapper, "x") as number;
    const mapY = gsap.getProperty(wrapper, "y") as number;
    gsap.set(bgParallax, { x: mapX * 0.2, y: mapY * 0.2 });
  };

  const centerCamera = (x: number, y: number, duration: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const offsetX = isSubLevelOpenRef.current ? (winW - PANEL_WIDTH) / 2 : winW / 2;
    gsap.to(wrapper, {
      x: -x * currentScaleRef.current + offsetX,
      y: -y * currentScaleRef.current + winH / 2,
      duration: duration,
      overwrite: "auto",
      onUpdate: updateParallax
    });
  };

  const getScreenPosition = (svgX: number, svgY: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { x: 0, y: 0 };
    const wrapperX = gsap.getProperty(wrapper, "x") as number;
    const wrapperY = gsap.getProperty(wrapper, "y") as number;
    return {
      x: svgX * currentScaleRef.current + wrapperX,
      y: svgY * currentScaleRef.current + wrapperY
    };
  };

  const createDust = (x: number, y: number) => {
    const decoLayer = decoLayerRef.current;
    if (!decoLayer) return;

    const p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const size = Math.random() * 5 + 3;
    p.setAttribute("cx", String(x));
    p.setAttribute("cy", String(y + 25));
    p.setAttribute("r", String(size));
    p.setAttribute("class", "dust-particle");
    decoLayer.appendChild(p);
    gsap.to(p, { attr: { r: 0, cy: y - 10, cx: x + (Math.random() - 0.5) * 30 }, opacity: 0, duration: 0.8, ease: "power1.out", onComplete: () => p.remove() });
  };

  const createPawPrint = (x: number, y: number, rotation: number) => {
    const pawsLayer = pawsLayerRef.current;
    if (!pawsLayer) return;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y}) rotate(${rotation})`);
    g.setAttribute("class", "paw-print");

    const mainPad = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    mainPad.setAttribute("cx", "0");
    mainPad.setAttribute("cy", "0");
    mainPad.setAttribute("rx", "6");
    mainPad.setAttribute("ry", "7");
    g.appendChild(mainPad);

    for (let i = 0; i < 4; i++) {
      const toe = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const angle = (i - 1.5) * 0.5;
      toe.setAttribute("cx", String(Math.sin(angle) * 7));
      toe.setAttribute("cy", String(-8 + Math.cos(angle) * 2));
      toe.setAttribute("r", "2");
      g.appendChild(toe);
    }

    pawsLayer.appendChild(g);

    gsap.to(g, {
      opacity: 0,
      duration: 2,
      delay: 0.5,
      onComplete: () => g.remove()
    });
  };

  const createConfetti = (x: number, y: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
      confetti.style.left = x + 'px';
      confetti.style.top = y + 'px';
      viewport.appendChild(confetti);

      gsap.to(confetti, {
        x: (Math.random() - 0.5) * 300,
        y: -200 + Math.random() * -100,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 1.5 + Math.random(),
        ease: "power2.out",
        onComplete: () => confetti.remove()
      });
    }
  };

  const bark = (x: number, y: number) => {
    const barkSound = barkSoundRef.current;
    if (barkSound) {
      barkSound.currentTime = 0;
      barkSound.play().catch(() => console.log('Áudio bloqueado pelo navegador'));
    }

    const bubble = document.createElement('div');
    bubble.className = 'bark-bubble';
    bubble.textContent = 'AU AU! 🐕';
    bubble.style.left = (x + 50) + 'px';
    bubble.style.top = (y - 80) + 'px';
    document.body.appendChild(bubble);

    gsap.fromTo(bubble,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out" }
    );

    gsap.to(bubble, {
      y: -20,
      opacity: 0,
      duration: 1,
      delay: 1,
      ease: "power2.in",
      onComplete: () => bubble.remove()
    });

    const fuba = fubaRef.current;
    if (fuba) {
      gsap.timeline()
        .to(fuba, { attr: { width: 80, height: 80 }, duration: 0.1, repeat: 3, yoyo: true })
        .to(fuba, { rotation: -15, duration: 0.1 })
        .to(fuba, { rotation: 15, duration: 0.1 })
        .to(fuba, { rotation: 0, duration: 0.1 });
    }
  };

  const checkObstacleInteraction = (x: number, y: number) => {
    const obstaclesLayer = obstaclesLayerRef.current;
    if (!obstaclesLayer) return;

    const obstacles = obstaclesLayer.querySelectorAll('.obstacle');
    obstacles.forEach(obs => {
      const ox = parseFloat(obs.getAttribute('x') || '0');
      const oy = parseFloat(obs.getAttribute('y') || '0');
      const dist = Math.hypot(x - ox, y - oy);

      if (dist < 60) {
        gsap.to(obs, {
          scale: 1.3,
          rotation: 360,
          duration: 0.5,
          ease: "back.out",
          onComplete: () => {
            gsap.to(obs, { scale: 1, rotation: 0, duration: 0.3 });
          }
        });
      }
    });
  };

  const iniciarNavegacao = (targetIndex: number | null = null) => {
    if (isNavigatingRef.current) return;
    if (isSubLevelOpenRef.current) backToMap();

    const idx = targetIndex !== null ? targetIndex : selectedDestino;
    const target = careerData[idx];
    setSelectedDestino(idx);
    isNavigatingRef.current = true;

    const fuba = fubaRef.current;
    const activePath = activePathRef.current;
    const previewPath = previewPathRef.current;
    const maskRevealPath = maskRevealPathRef.current;
    const wrapper = wrapperRef.current;
    const nodesLayer = nodesLayerRef.current;

    if (!fuba || !activePath || !previewPath || !maskRevealPath || !wrapper || !nodesLayer) {
      isNavigatingRef.current = false;
      return;
    }

    const startX = gsap.getProperty(fuba, "x") as number;
    const startY = gsap.getProperty(fuba, "y") as number;

    const dist = Math.hypot(startX - target.x, startY - target.y);
    if (dist < 80) {
      isNavigatingRef.current = false;
      enterSubLevel(target);
      return;
    }

    const pathD = generateCrazyLoop(startX, startY, target.x, target.y);
    activePath.setAttribute("d", pathD);
    previewPath.setAttribute("d", pathD);
    maskRevealPath.setAttribute("d", pathD);

    const len = activePath.getTotalLength();
    gsap.set(activePath, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(maskRevealPath, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(previewPath, { strokeDashoffset: 0, opacity: 0.3 });

    const tl = gsap.timeline({
      onComplete: () => {
        isNavigatingRef.current = false;
        const targetScreenPos = getScreenPosition(target.x, target.y);
        createConfetti(targetScreenPos.x, targetScreenPos.y);
        bark(targetScreenPos.x, targetScreenPos.y);
        setTimeout(() => { enterSubLevel(target); }, 1500);
      }
    });

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    tl.to(wrapper, {
      x: -startX * currentScaleRef.current + winW / 2,
      y: -startY * currentScaleRef.current + winH / 2,
      duration: 1, ease: "power2.inOut",
      onUpdate: updateParallax
    }, 0);

    tl.to(maskRevealPath, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, 0);
    tl.to(previewPath, { strokeDashoffset: -150, duration: 1.5, ease: "linear" }, 0);

    tl.add("fubaRun", "+=0.2");
    tl.to(activePath, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" }, "fubaRun");
    tl.to(fuba, {
      motionPath: {
        path: pathD,
        alignOrigin: [0.5, 0.5],
        autoRotate: false
      },
      duration: 2.2, ease: "power2.inOut",
      onUpdate: function () {
        // Add +35 to get the visual center of the 70x70 foreignObject
        const cx = (gsap.getProperty(fuba, "x") as number) + 35;
        const cy = (gsap.getProperty(fuba, "y") as number) + 35;

        if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: -1 });
        else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: 1 });
        lastFubaXRef.current = cx;

        if (Math.random() > 0.7) createDust(cx, cy);

        pawPrintCounterRef.current++;
        if (pawPrintCounterRef.current % 6 === 0) {
          const rotation = gsap.getProperty(fuba, "scaleX") === -1 ? -30 : 30;
          createPawPrint(cx, cy + 15, rotation);
        }

        checkObstacleInteraction(cx, cy);
        centerCamera(cx, cy, 0.05);
      }
    }, "fubaRun");

    tl.set(previewPath, { opacity: 0 });
    const nodeCircle = nodesLayer.children[idx]?.querySelector('circle');
    if (nodeCircle) {
      tl.to(nodeCircle, { attr: { r: 25 }, duration: 0.2, yoyo: true, repeat: 3 });
    }
  };

  const enterSubLevel = (parentNode: CareerNode) => {
    isSubLevelOpenRef.current = true;
    const mainGroup = mainGroupRef.current;
    const yGroup = yGroupRef.current;
    const uiHeader = uiHeaderRef.current;
    const wrapper = wrapperRef.current;

    if (!mainGroup || !yGroup || !uiHeader || !wrapper) return;

    mainGroup.classList.add('map-dimmed');
    uiHeader.style.opacity = '0';
    gsap.to(yGroup, { opacity: 1, duration: 0.5 });
    yGroup.style.pointerEvents = 'all';

    yGroup.innerHTML = '';
    const cx = parentNode.x;
    const cy = parentNode.y;
    const gap = 180;

    const nodesTree: TreeNode[] = [
      { id: 'estag', x: cx, y: cy + (gap * 3), label: 'Base', role: 'base' },
      { id: 'jr', x: cx, y: cy + (gap * 2), label: 'Júnior', role: 'base' },
      { id: 'pl', x: cx, y: cy + gap, label: 'Pleno', role: 'base' },
      { id: 'sr', x: cx, y: cy, label: parentNode.label, role: 'split' },
      { id: 'tec', x: cx - 200, y: cy - 200, label: 'Especialista', role: 'tec' },
      { id: 'ges', x: cx + 200, y: cy - 200, label: 'Gestão', role: 'ges' }
    ];

    const drawTreeLine = (x1: number, y1: number, x2: number, y2: number) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = `M${x1},${y1} L${x2},${y2}`;
      path.setAttribute("d", d);
      path.setAttribute("class", "path-tree");
      yGroup.prepend(path);
      const len = 500;
      path.setAttribute("stroke-dasharray", String(len));
      path.setAttribute("stroke-dashoffset", String(len));
      gsap.to(path, { strokeDashoffset: 0, duration: 0.6, ease: "power1.out" });
    };

    drawTreeLine(nodesTree[0].x, nodesTree[0].y, nodesTree[1].x, nodesTree[1].y);
    drawTreeLine(nodesTree[1].x, nodesTree[1].y, nodesTree[2].x, nodesTree[2].y);
    drawTreeLine(nodesTree[2].x, nodesTree[2].y, nodesTree[3].x, nodesTree[3].y);
    drawTreeLine(nodesTree[3].x, nodesTree[3].y, nodesTree[4].x, nodesTree[4].y);
    drawTreeLine(nodesTree[3].x, nodesTree[3].y, nodesTree[5].x, nodesTree[5].y);

    nodesTree.forEach((n, idx) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.style.cursor = "pointer";
      g.addEventListener("mousedown", e => e.stopPropagation());
      
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(n.x));
      c.setAttribute("cy", String(n.y));
      c.setAttribute("r", "20");
      c.setAttribute("class", "tree-node");
      if (idx === 0) c.classList.add('tree-node-active');
      
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tree-node').forEach(node => node.classList.remove('tree-node-active'));
        c.classList.add('tree-node-active');
        updatePanel(n);
      });

      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", String(n.x));
      t.setAttribute("y", String(n.y + 45));
      t.textContent = n.label;
      t.setAttribute("class", "label-text");
      g.appendChild(c);
      g.appendChild(t);
      yGroup.appendChild(g);
    });

    // Use nodesTree[3] (the parent node "sr") for better centering
    const targetNode = nodesTree[3];
    const visibleWidth = window.innerWidth - PANEL_WIDTH;
    const targetCenterX = visibleWidth / 2;
    const targetCenterY = window.innerHeight / 2;

    gsap.to(wrapper, {
      x: -targetNode.x * currentScaleRef.current + targetCenterX,
      y: -targetNode.y * currentScaleRef.current + targetCenterY,
      scale: 1.1, duration: 1.2, ease: "power2.inOut",
      onUpdate: updateParallax
    });
    currentScaleRef.current = 1.1;
    updatePanel(targetNode);
  };

  const updatePanel = (data: TreeNode) => {
    setPanelData({
      title: data.label,
      badge: data.role === 'base' ? "Fase Fundamental" : "Especialização",
      desc: "Descrição de " + data.label,
      showContent: true
    });
    setIsPanelOpen(true);
  };

  const backToMap = () => {
    isSubLevelOpenRef.current = false;
    const mainGroup = mainGroupRef.current;
    const yGroup = yGroupRef.current;
    const uiHeader = uiHeaderRef.current;
    const wrapper = wrapperRef.current;
    const fuba = fubaRef.current;

    if (!mainGroup || !yGroup || !uiHeader || !wrapper || !fuba) return;

    mainGroup.classList.remove('map-dimmed');
    uiHeader.style.opacity = '1';
    setIsPanelOpen(false);
    gsap.to(yGroup, { opacity: 0, duration: 0.5 });
    yGroup.style.pointerEvents = 'none';

    // Add +35 to get the visual center of the 70x70 foreignObject
    const fx = (gsap.getProperty(fuba, "x") as number) + 35;
    const fy = (gsap.getProperty(fuba, "y") as number) + 35;
    gsap.to(wrapper, {
      x: -fx * currentScaleRef.current + window.innerWidth / 2,
      y: -fy * currentScaleRef.current + window.innerHeight / 2,
      scale: 1, duration: 0.8, ease: "power2.inOut",
      onUpdate: updateParallax
    });
    currentScaleRef.current = 1;
    gsap.set(fuba, { scaleX: 1 });
  };

  const handleTracerRota = () => {
    iniciarNavegacao(null);
  };

  return (
    <>
      <style>{`
        :root {
          --fuba-orange: #f37021;
          --checkpoint-blue: #00809d;
          --preview-blue: #00ffcc;
          --bg-color: #05070a;
          --sidebar-bg: rgba(13, 17, 23, 0.98);
          --panel-width: 450px;
        }

        .fuba-explorer-body { 
          margin: 0; 
          background-color: var(--bg-color);
          color: white; 
          font-family: 'Segoe UI', sans-serif; 
          overflow: hidden; 
        }
        
        #parallax-bg {
          position: fixed; top: -100%; left: -100%; width: 300%; height: 300%;
          background-image: 
            radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 50px 50px, 120px 120px;
          background-position: 0 0, 60px 60px;
          z-index: 0;
          pointer-events: none;
          will-change: transform;
        }

        #ui-header { 
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          z-index: 500; 
          background: rgba(15, 23, 42, 0.9); 
          padding: 10px 25px; 
          border-radius: 50px; border: 1px solid rgba(243, 112, 33, 0.3);
          display: flex; align-items: center; gap: 15px; 
          transition: all 0.5s;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        #side-panel {
          position: fixed; top: 0; right: calc(var(--panel-width) * -1);
          width: var(--panel-width); height: 100vh;
          background: var(--sidebar-bg);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          padding: 40px; box-sizing: border-box;
          z-index: 1000;
          transition: right 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -20px 0 60px rgba(0,0,0,0.9);
          display: flex; flex-direction: column;
        }
        #side-panel.open { right: 0; }

        #viewport { 
          width: 100vw; height: 100vh; 
          cursor: grab; overflow: hidden; 
          position: fixed; top: 0; left: 0; z-index: 1; 
        }
        #viewport:active { cursor: grabbing; }

        #map-wrapper { 
          width: 3500px; height: 2500px; 
          position: absolute;
          will-change: transform;
          z-index: 1;
        }

        #network-svg { width: 100%; height: 100%; pointer-events: none; overflow: visible; }

        .path-static { fill: none; stroke: rgba(255, 255, 255, 0.08); stroke-width: 2; }
        
        .path-preview {
          fill: none; stroke: var(--preview-blue); stroke-width: 2; 
          stroke-linecap: round; stroke-dasharray: 15 10;
          filter: drop-shadow(0 0 5px var(--preview-blue)); opacity: 0.3;
        }

        .path-active { 
          fill: none; stroke: var(--fuba-orange); stroke-width: 6; 
          stroke-linecap: round; filter: drop-shadow(0 0 15px var(--fuba-orange)); 
        }
        
        .path-tree { fill: none; stroke: #00ffcc; stroke-width: 4; stroke-linecap: round; }
        
        .deco-dot { fill: #00809d; opacity: 0.6; pointer-events: none; }
        .dust-particle { fill: rgba(255, 255, 255, 0.4); pointer-events: none; }

        .paw-print { 
          fill: rgba(243, 112, 33, 0.4); 
          pointer-events: none; 
          filter: drop-shadow(0 0 3px rgba(243, 112, 33, 0.6));
        }

        .obstacle {
          font-size: 32px;
          pointer-events: none;
          filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));
        }

        .confetti {
          position: absolute;
          pointer-events: none;
          font-size: 20px;
        }

        .node-group { cursor: pointer; pointer-events: all; }
        .node-point { fill: var(--checkpoint-blue); stroke: rgba(255,255,255,0.8); stroke-width: 2; transition: all 0.3s; }
        .node-group:hover .node-point { r: 22; fill: #00c3ff; stroke-width: 4; filter: drop-shadow(0 0 20px #00c3ff); }
        
        .tree-node { fill: #0f172a; stroke: #00ffcc; stroke-width: 3; pointer-events: all; cursor: pointer; transition: all 0.3s; }
        .tree-node:hover { fill: #00ffcc; stroke: white; filter: drop-shadow(0 0 15px #00ffcc); }
        .tree-node-active { fill: #00ffcc !important; stroke: white !important; stroke-width: 4 !important; filter: drop-shadow(0 0 20px #00ffcc); }

        .label-text { fill: white; font-size: 14px; font-weight: 600; text-anchor: middle; pointer-events: none; text-shadow: 0 4px 8px black; font-family: 'Segoe UI', sans-serif; }
        
        #fuba { 
          width: 70px;
          height: 70px;
          pointer-events: none; 
          z-index: 999; 
          filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5));
          transform-origin: 35px 35px;
          overflow: visible;
        }

        .bark-bubble {
          position: absolute;
          background: white;
          color: #f37021;
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 24px;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .bark-bubble:after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid white;
        }

        .map-dimmed { opacity: 0.05; filter: blur(4px); transition: all 0.8s; pointer-events: none; }
        .y-layer-visible { opacity: 1 !important; transition: opacity 0.5s; }
        .y-layer-hidden { opacity: 0; pointer-events: none; transition: opacity 0.5s; }

        .fuba-select { background: #1e293b; color: white; border: 1px solid #444; padding: 10px 20px; border-radius: 25px; cursor: pointer; outline: none; }
        .fuba-button { background: var(--fuba-orange); color: white; border: none; padding: 10px 25px; border-radius: 25px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .fuba-button:hover { background: #ff8534; transform: scale(1.05); }
        .close-btn { position: absolute; top: 30px; right: 30px; background: rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 50%; font-size: 24px; color: white; border: none; cursor: pointer; }
        .close-btn:hover { background: #ff4444; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="fuba-explorer-body" style={{ position: 'fixed', inset: 0, backgroundColor: '#05070a' }}>
        <audio ref={barkSoundRef} preload="auto">
          <source src="https://www.myinstants.com/media/sounds/latido-unico.mp3" type="audio/mpeg" />
        </audio>

        <div id="parallax-bg" ref={bgParallaxRef}></div>

        <div id="ui-header" ref={uiHeaderRef}>
          <strong style={{ color: '#f37021', fontSize: '1.2rem' }}>Fubá Explorer</strong>
          <select
            className="fuba-select"
            value={selectedDestino}
            onChange={(e) => setSelectedDestino(Number(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {careerData.map((data, index) => (
              <option key={data.id} value={index}>{data.label}</option>
            ))}
          </select>
          <button className="fuba-button" onClick={handleTracerRota}>Traçar Rota</button>
        </div>

        <div id="side-panel" ref={panelRef} className={isPanelOpen ? 'open' : ''}>
          <button className="close-btn" onClick={backToMap}>×</button>
          <h1 style={{ color: '#f37021', marginTop: '50px', fontSize: '2rem' }}>{panelData.title}</h1>
          <span style={{ background: 'rgba(0, 255, 204, 0.1)', color: '#00ffcc', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #00ffcc', display: 'inline-block', marginBottom: '20px' }}>{panelData.badge}</span>
          <p style={{ color: '#ccc', lineHeight: 1.6, fontSize: '1.1rem', marginBottom: '30px' }}>{panelData.desc}</p>

          {panelData.showContent && (
            <div style={{ animation: 'fadeIn 0.5s' }}>
              <h4 style={{ marginTop: '30px', color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Responsabilidades</h4>
              <ul style={{ color: '#aaa', paddingLeft: '20px', lineHeight: 2 }}>
                <li>Entregar tarefas com qualidade</li>
                <li>Participar de rituais ágeis</li>
                <li>Documentar código desenvolvido</li>
              </ul>
              <button className="fuba-button" style={{ width: '100%', marginTop: '40px', background: '#00809d', padding: '15px' }} onClick={() => alert('Inscrição simulada!')}>Ver Detalhes da Vaga</button>
            </div>
          )}
        </div>

        <div id="viewport" ref={viewportRef}>
          <div id="map-wrapper" ref={wrapperRef}>
            <svg id="network-svg">
              <defs>
                <mask id="path-mask" maskUnits="userSpaceOnUse">
                  <path ref={maskRevealPathRef} d="" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round" />
                </mask>
              </defs>

              <g id="main-map-group" ref={mainGroupRef}>
                <g id="paths-layer" ref={pathsLayerRef}></g>
                <path ref={previewPathRef} className="path-preview" d="" mask="url(#path-mask)" />
                <path ref={activePathRef} className="path-active" d="" />
                <g id="obstacles-layer" ref={obstaclesLayerRef}></g>
                <g id="paws-layer" ref={pawsLayerRef}></g>
                <g id="deco-layer" ref={decoLayerRef}></g>
                <g id="nodes-layer" ref={nodesLayerRef}></g>
                <foreignObject ref={fubaRef} id="fuba" x="0" y="0" width="70" height="70">
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src="https://i.imgur.com/HrUI0Fn.gif" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        ((e.target as HTMLImageElement).parentElement as HTMLElement).innerHTML = '🐕';
                        ((e.target as HTMLImageElement).parentElement as HTMLElement).style.fontSize = '60px';
                      }}
                      crossOrigin="anonymous"
                      alt="Fubá"
                    />
                  </div>
                </foreignObject>
              </g>
              <g id="y-system-group" ref={yGroupRef} className="y-layer-hidden"></g>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
