"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, Keyboard, Package, Send, Triangle, UserCheck, Lock, ShoppingBasket } from "lucide-react";
import type { CartLine, Product } from "@/lib/assistantEngine";
import "./hologram.css";

const naira = (n: number) => "\u20a6" + Number(n).toLocaleString("en-NG");

type Props = {
  started: boolean;
  onStart: () => void;
  onArrive: () => void;
  onActivity: () => void;
  shopName: string;
  away: boolean;
  online: boolean;
  aiOn: boolean;
  aiErr: string;
  pending: number;
  active: boolean; // a customer conversation is under way
  speech: string;
  heard: string;
  matches: Product[];
  cart: CartLine[];
  total: number;
  discount: number;
  listening: boolean;
  speaking: boolean;
  thinking: boolean;
  onSend: (text: string) => void;
  onMic: () => void;
  onShowProducts: () => void;
  onCheckout: () => void;
  onOwnerExit: () => void;
  extra?: React.ReactNode; // modals supplied by the parent
};

// Glowing assistant figure (from the hologram prototype). Ids are made unique so it can be drawn four times.
function Avatar({ uid, cls }: { uid: string; cls: string }) {
  return (
    <div className={`hg-avatar ${cls}`}>
      <svg viewBox="0 0 300 480" role="img" aria-label="Glowing virtual shop assistant">
        <defs>
          <linearGradient id={`g${uid}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#c8ffff" /><stop offset=".45" stopColor="#72edff" /><stop offset="1" stopColor="#218acb" /></linearGradient>
          <radialGradient id={`glow${uid}`}><stop stopColor="#4beaff" stopOpacity=".26" /><stop offset="1" stopColor="#4beaff" stopOpacity="0" /></radialGradient>
          <linearGradient id={`body${uid}`} x1="0" x2="1"><stop stopColor="#4bc8ec" stopOpacity=".05" /><stop offset=".5" stopColor="#90faff" stopOpacity=".33" /><stop offset="1" stopColor="#4bc8ec" stopOpacity=".05" /></linearGradient>
        </defs>
        <ellipse cx="150" cy="250" rx="128" ry="210" fill={`url(#glow${uid})`} className="hg-aura" />
        <ellipse cx="150" cy="134" rx="49" ry="63" fill="#7df5ff" opacity=".11" stroke={`url(#g${uid})`} strokeWidth="2" />
        <path d="M103 130 Q100 62 150 65 Q203 69 198 132 Q190 101 178 94 Q154 111 111 104Z" fill="#54d8ee" fillOpacity=".1" stroke={`url(#g${uid})`} strokeWidth="2" />
        <path d="M119 135 Q128 126 137 135 M163 135 Q172 126 181 135" fill="none" stroke="#c6ffff" strokeWidth="3" strokeLinecap="round" />
        <path className="hg-mouth" d="M139 159 Q150 168 161 159" fill="none" stroke="#b6ffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M143 195 L143 220 M157 195 L157 220" stroke={`url(#g${uid})`} strokeWidth="2" opacity=".8" />
        <path d="M143 209 Q91 208 75 238 L53 340 Q48 366 72 369 L106 370 L117 443 Q150 461 183 443 L194 370 L228 369 Q252 366 247 340 L225 238 Q209 208 157 209Z" fill={`url(#body${uid})`} stroke={`url(#g${uid})`} strokeWidth="2.5" />
        <path d="M77 237 Q97 265 122 269 L150 248 L178 269 Q204 265 223 237 M122 269 L111 369 M178 269 L189 369 M111 369 Q150 388 189 369" fill="none" stroke="#84f6ff" strokeOpacity=".72" strokeWidth="2" />
        <path d="M93 252 L66 331 Q64 344 77 346 L107 338 M207 252 L234 331 Q236 344 223 346 L193 338" fill="none" stroke={`url(#g${uid})`} strokeWidth="2.5" />
        <path d="M119 443 L109 464 M181 443 L191 464 M109 464 L191 464" fill="none" stroke="#6ce8ff" strokeWidth="2" />
        <g className="hg-scan"><path d="M83 110 Q150 96 217 110" stroke="#d5ffff" opacity=".45" strokeWidth="1" fill="none" /></g>
        <circle className="hg-ring" cx="150" cy="280" r="132" fill="none" stroke="#7ff8ff" strokeWidth="1" opacity=".38" />
        <path d="M60 82h20M60 82v20M220 82h20M240 82v20M60 380h20M60 360v20M220 380h20M240 360v20" fill="none" stroke="#72edff" strokeWidth="1.5" opacity=".65" />
      </svg>
    </div>
  );
}

export default function HologramView(p: Props) {
  const [sensing, setSensing] = useState(false);
  const [pyramid, setPyramid] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const presentRef = useRef(false);
  const lastMotionRef = useRef(0);
  const lastLeaveRef = useRef(0);
  const onArriveRef = useRef(p.onArrive);
  const activityRef = useRef(0);
  onArriveRef.current = p.onArrive;

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2600); };

  // keep "recent activity" in a ref so the sensing loop can read it
  useEffect(() => { activityRef.current = Date.now(); }, [p.speech, p.heard, p.cart.length]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setSensing(true);
      say("Arrival sensing on. It looks for movement only.");
    } catch {
      say("Allow camera access to turn on arrival sensing.");
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSensing(false);
    presentRef.current = false;
  }

  // Movement sensing: tiny 32x24 frames, compared with the previous one. No faces, nothing recorded.
  useEffect(() => {
    if (!sensing) return;
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    let last: Uint8ClampedArray | null = null;
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!ctx || !v || v.readyState < 2) return;
      ctx.drawImage(v, 0, 0, 32, 24);
      const data = ctx.getImageData(0, 0, 32, 24).data;
      let avg = 0;
      if (last) {
        for (let i = 0; i < data.length; i += 4) avg += Math.abs(data[i] - last[i]) + Math.abs(data[i + 1] - last[i + 1]) + Math.abs(data[i + 2] - last[i + 2]);
        avg /= data.length;
      }
      last = new Uint8ClampedArray(data);
      const now = Date.now();
      if (avg > 17) {
        lastMotionRef.current = now;
        // greet once when someone arrives, not on every movement
        if (!presentRef.current && now - lastLeaveRef.current > 5000) {
          presentRef.current = true;
          onArriveRef.current();
        }
      } else if (presentRef.current && now - lastMotionRef.current > 45000 && now - activityRef.current > 45000) {
        presentRef.current = false; // they have left; the next person gets a fresh greeting
        lastLeaveRef.current = now;
      }
    }, 240);
    return () => clearInterval(t);
  }, [sensing]);

  useEffect(() => {
    const hide = () => { if (document.hidden) stopCamera(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stopCamera(); };
  }, []);

  const status = p.listening ? "Listening" : p.thinking ? "Thinking" : p.speaking ? "Speaking" : !p.online ? "Offline \u00b7 basic help" : sensing ? "Watching for customers" : "Ready";
  const avatarCls = p.listening ? "hg-listening" : p.speaking || p.thinking ? "hg-talking" : p.active ? "" : "hg-idle";
  const cards = p.matches.slice(0, 4);
  const bottomBasket = typing ? 134 : 78;

  if (!p.started) {
    return (
      <div className="hg-root hg-app">
        <div className="hg-start">
          <h1>{p.shopName}</h1>
          <p>{p.away ? "The owner is away. The assistant is on duty." : "Your shop assistant is ready."}</p>
          <button className="go" onClick={p.onStart}>Tap to start</button>
          <p style={{ fontSize: 12, color: "#78a8b2" }}>The tap unlocks sound and the microphone in the browser.</p>
        </div>
        <button className="hg-lock" onClick={p.onOwnerExit} aria-label="Owner exit"><Lock size={16} /></button>
        {p.extra}
      </div>
    );
  }

  return (
    <div className={`hg-root hg-app ${pyramid ? "hg-pyramid" : ""}`}>
      <div className="hg-stars" />
      <header className="hg-header">
        <div className="hg-brand">STOCKWISE <b>AI</b> {"\u00b7"} {p.shopName.toUpperCase()}</div>
        <div className="hg-status"><i />{status}{p.pending ? ` \u00b7 ${p.pending} waiting` : ""}{p.aiErr ? ` \u00b7 AI problem: ${p.aiErr}` : p.online && !p.aiOn ? " \u00b7 basic mode" : ""}</div>
      </header>

      <section className="hg-stage">
        <div className={`hg-welcome ${p.active ? "hg-show" : ""}`}>
          <small>{p.shopName}</small>
          <h1>Welcome in</h1>
          <p>{p.away ? "The owner is away, I'll look after you" : "Your shop assistant is ready to help"}</p>
        </div>
        <Avatar uid="main" cls={avatarCls} />
        <div className="hg-speech">{p.speech || "Waiting for a customer\u2026"}</div>
        {p.heard && p.active && <div className="hg-heard">You: {"\u201c"}{p.heard}{"\u201d"}</div>}
        <div className={`hg-products ${p.active && cards.length ? "hg-show" : ""}`}>
          {cards.map((c) => (
            <div key={c.id} className="hg-item">
              <Package size={20} className="hg-ico" />
              <strong>{c.product_name}</strong>
              <small>{naira(c.unit_price)}{c.unit && c.unit !== "unit" ? ` / ${c.unit}` : ""}</small>
              <em>{Number(c.quantity_in_stock) > 0 ? `Live stock: ${Number(Number(c.quantity_in_stock).toFixed(3))}` : "Out of stock"}</em>
            </div>
          ))}
        </div>
        <div className="hg-beam" />
        <div className="hg-faces">
          {pyramid && [0, 1, 2, 3].map((i) => (
            <div key={i} className="hg-face">
              <Avatar uid={`p${i}`} cls={avatarCls} />
              <div className="hg-face-label">{cards[i] ? `${cards[i].product_name} \u00b7 ${naira(cards[i].unit_price)}` : "Stockwise AI"}</div>
            </div>
          ))}
        </div>
      </section>

      {!typing && !p.cart.length && <div className="hg-note">Camera sensing looks for movement only. No face recognition or recording.</div>}

      {p.cart.length > 0 && !pyramid && (
        <div className="hg-basket" style={{ bottom: bottomBasket }}>
          <ShoppingBasket size={16} />
          <span>{p.cart.length} item{p.cart.length > 1 ? "s" : ""} {"\u00b7"} <b>{naira(p.total)}</b>{p.discount ? ` (${p.discount}% off)` : ""}</span>
          <button onClick={p.onCheckout}>Pay</button>
        </div>
      )}

      {typing && !pyramid && (
        <form className="hg-typebar" style={{ bottom: 72 }} onSubmit={(e) => { e.preventDefault(); if (input.trim()) { p.onActivity(); p.onSend(input); setInput(""); } }}>
          <input autoFocus placeholder="Type what you need..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button aria-label="Send"><Send size={16} /></button>
        </form>
      )}

      <div className="hg-controls">
        <button className={sensing ? "hg-on" : "hg-primary"} onClick={() => (sensing ? stopCamera() : startCamera())}>
          {sensing ? <><CameraOff size={13} style={{ display: "inline", marginRight: 4 }} />Stop sensing</> : <><Camera size={13} style={{ display: "inline", marginRight: 4 }} />Start arrival sensing</>}
        </button>
        <button onClick={() => { presentRef.current = true; p.onArrive(); }}><UserCheck size={13} style={{ display: "inline", marginRight: 4 }} />Customer arrived</button>
        <button className={p.listening ? "hg-on" : ""} onClick={() => { p.onActivity(); p.onMic(); }}><Mic size={13} style={{ display: "inline", marginRight: 4 }} />Speak</button>
        <button onClick={() => { p.onActivity(); p.onShowProducts(); }}>Show products</button>
        <button onClick={() => setTyping(!typing)}><Keyboard size={13} style={{ display: "inline", marginRight: 4 }} />Type</button>
        <button onClick={() => { const on = !pyramid; setPyramid(on); say(on ? "Pyramid view: place a clear reflector pyramid over the screen centre." : "Projection view"); }}>
          <Triangle size={13} style={{ display: "inline", marginRight: 4 }} />{pyramid ? "Exit pyramid" : "Pyramid view"}
        </button>
      </div>

      <button className="hg-lock" onClick={p.onOwnerExit} aria-label="Owner exit"><Lock size={16} /></button>
      <video ref={videoRef} className="hg-camera" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hg-camera" width={32} height={24} />
      <div className={`hg-toast ${toast ? "hg-show" : ""}`}>{toast}</div>
      {p.extra}
    </div>
  );
}
