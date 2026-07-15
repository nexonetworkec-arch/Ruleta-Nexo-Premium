
import { StateManager } from './core';
import { mixColors } from './utils';
import { THEME_PRESETS } from './config';

export class AudioEngine {
    ctx: AudioContext | null = null;
    lastTickTime = 0;
    
    constructor() {}

    init() {
        if (!this.ctx) {
            // @ts-ignore
            this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTick() { 
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Limit ticks to at most one every 50ms to prevent distorted noise at super high speeds
        if (now - this.lastTickTime < 0.05) return;
        this.lastTickTime = now;

        if (this.ctx.state === 'suspended') this.ctx.resume();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(); 
        o.type = 'triangle'; // Warmer, more wooden physical click sound
        o.frequency.setValueAtTime(450, now); 
        o.frequency.exponentialRampToValueAtTime(150, now + 0.04);
        g.gain.setValueAtTime(0.12, now); 
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(now + 0.04);
    }

    playWin() { 
        if (!this.ctx) return;
        if(this.ctx.state === 'suspended') this.ctx.resume();
        [261, 329, 392].forEach((f, i) => { 
            const o = this.ctx.createOscillator(); 
            o.frequency.value = f; o.connect(this.ctx.destination); o.start(this.ctx!.currentTime + i*0.1); o.stop(this.ctx!.currentTime + 0.5); 
        });
    }

    playSuspenseHeartbeat(isFast = false) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const baseFreq = isFast ? 75 : 60;
        const volume = isFast ? 0.6 : 0.45;
        
        // Double beat (lub-dub)
        const playBeat = (timeOffset: number, volMultiplier: number, freqOffset: number) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq + freqOffset, now + timeOffset);
            osc.frequency.exponentialRampToValueAtTime(20, now + timeOffset + 0.15);
            
            // Add a lowpass filter to make it sound deeply organic/bumpy like a real heartbeat
            const lp = this.ctx!.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(120, now + timeOffset);
            
            gain.gain.setValueAtTime(volume * volMultiplier, now + timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.15);
            
            osc.connect(lp);
            lp.connect(gain);
            gain.connect(this.ctx!.destination);
            
            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.18);
        };
        
        // Beat 1 (Lub)
        playBeat(0, 1.0, 5);
        // Beat 2 (Dub) - slightly later, lower amplitude and lower frequency
        playBeat(0.24, 0.7, 0);
    }

    playLightningImpact() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;

        // 1. Synth Thunder Crackle: Noise generation
        try {
            const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = buffer;

            // Filter to shape noise into deep explosion/thunder rumbling
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(150, now);
            filter.frequency.exponentialRampToValueAtTime(30, now + 1.2);
            filter.Q.setValueAtTime(4.0, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.5, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseNode.start(now);
        } catch (e) {
            console.error("Web Audio buffer noise generation error:", e);
        }

        // 2. High voltage discharge: Sharp high pitch pulse
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

        const oscFilter = this.ctx.createBiquadFilter();
        oscFilter.type = 'peaking';
        oscFilter.frequency.setValueAtTime(2000, now);

        oscGain.gain.setValueAtTime(0.25, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

export class ConfettiEngine {
    private canvasEl: HTMLCanvasElement | null = null;
    private ctxEl: CanvasRenderingContext2D | null = null;
    items: any[];

    constructor() { 
        this.items = []; 
    }

    private get canvas(): HTMLCanvasElement | null {
        if (!this.canvasEl) {
            this.canvasEl = document.getElementById('confettiCanvas') as HTMLCanvasElement;
        }
        return this.canvasEl;
    }

    private get ctx(): CanvasRenderingContext2D | null {
        if (!this.ctxEl && this.canvas) {
            this.ctxEl = this.canvas.getContext('2d');
        }
        return this.ctxEl;
    }

    burst() { 
        const canvas = this.canvas;
        const ctx = this.ctx;
        if (!canvas || !ctx) {
            console.warn("Confetti canvas or context not found");
            return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight; 
        
        let currentCustom = THEME_PRESETS['nexo-gold'];
        try {
            if (StateManager.config && StateManager.config.themeCustomizations && StateManager.config.themeId) {
                const custom = StateManager.config.themeCustomizations[StateManager.config.themeId];
                if (custom) currentCustom = custom;
            }
        } catch (e) {
            console.error("Error reading theme customizations in ConfettiEngine:", e);
        }

        for(let i=0; i<80; i++) {
            const particleColor = Math.random() > 0.5 ? currentCustom.primary : currentCustom.secondary;
            this.items.push({ 
                x: window.innerWidth/2, 
                y: window.innerHeight/2, 
                vx: (Math.random()-0.5)*20, 
                vy: (Math.random()-0.5)*20-10, 
                size: Math.random()*8+4, 
                color: particleColor, 
                a: 1 
            });
        }
        this.loop(); 
    }

    loop() { 
        const canvas = this.canvas;
        const ctx = this.ctx;
        if (!canvas || !ctx) return;
        
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        this.items.forEach((p) => { 
            p.x += p.vx; 
            p.y += p.vy; 
            p.vy += 0.4; 
            p.a -= 0.01; 
            ctx.fillStyle = p.color; 
            ctx.globalAlpha = Math.max(0, p.a); 
            ctx.fillRect(p.x, p.y, p.size, p.size); 
        });
        
        this.items = this.items.filter(p => p.a > 0);
        
        if (this.items.length > 0) {
            requestAnimationFrame(() => this.loop()); 
        }
    }
}

export interface WheelPrize {
    name: string;
    isSpecial?: boolean;
    stock?: number;
}

export interface WheelTheme {
    primary: string;
    secondary: string;
    bg?: string;
    cardBg?: string;
    [key: string]: any;
}

export class Wheel {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    angle: number;
    isSpinning: boolean;
    audio: AudioEngine;
    confetti: ConfettiEngine;
    winnerIdx?: number;

    // Callbacks para separar la Vista del Motor
    onSpinComplete?: (premio: string) => void;
    onAdTrigger?: () => void;
    onSpinStart?: () => void;

    constructor() { 
        this.canvas = document.getElementById('wheelCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!; 
        this.angle = 0; 
        this.isSpinning = false; 
        this.audio = new AudioEngine(); 
        this.confetti = new ConfettiEngine();
    }

    /**
     * Obtiene los premios actuales de manera segura y modular, permitiendo futura inyección o integración.
     */
    getPrizes(): WheelPrize[] {
        try {
            return StateManager.config.prizes || [];
        } catch (e) {
            console.error("Error al leer los premios en Wheel:", e);
            return [];
        }
    }

    /**
     * Obtiene la paleta de colores del tema actual de manera desacoplada.
     */
    getTheme(): WheelTheme {
        try {
            const themeId = StateManager.config.themeId || 'nexo-gold';
            return StateManager.config.themeCustomizations[themeId] || THEME_PRESETS['nexo-gold'];
        } catch (e) {
            return THEME_PRESETS['nexo-gold'];
        }
    }

    /**
     * Obtiene la configuración global actual del StateManager.
     */
    getGlobalConfig() {
        try {
            return StateManager.config;
        } catch (e) {
            return null;
        }
    }

    /**
     * Guarda la configuración global en el StateManager.
     */
    saveGlobalConfig() {
        try {
            StateManager.save();
        } catch (e) {
            console.error("Error al guardar la configuración en el StateManager:", e);
        }
    }

    /**
     * Método principal de renderizado de la ruleta.
     */
    draw() {
        const w = 1000;
        const cx = 500;
        const outerR = 480; // Radio externo de la llanta/aro
        const wheelR = 445; // Radio real de las rebanadas del premio (deja 35px para el aro)
        
        this.ctx.clearRect(0, 0, w, w);
        
        const prizes = this.getPrizes();
        const theme = this.getTheme();
        
        if (prizes.length === 0) {
            this.drawEmptyState(cx, outerR, wheelR, theme);
            return;
        }
        
        const sliceAngle = (Math.PI * 2) / prizes.length;
        
        // 1. Dibujar el Aro Externo Lujoso con Gradiente Metálico
        this.drawRim(cx, outerR, wheelR, theme);
        
        // 2. Dibujar las Rebanadas (Slices) de la Ruleta con Gradiente de Profundidad y Textos
        this.drawSlices(cx, wheelR, theme, prizes, sliceAngle);
        
        // 3. Capa de reflejo de cúpula de cristal (Glass Dome reflection)
        this.drawGlassDome(cx, wheelR);
        
        // 4. Dibujar hueco circular transparente en el centro (Bisel metálico 3D)
        this.drawCenterHole(cx, theme);
        
        // 5. Dibujar Luces LED parpadeantes
        this.drawLEDs(cx, prizes.length, theme);
    }

    /**
     * Dibuja el estado vacío cuando no hay participantes o premios registrados.
     */
    drawEmptyState(cx: number, outerR: number, wheelR: number, theme: WheelTheme) {
        // 1. Dibujar el Aro Externo Lujoso con Gradiente Metálico (Titanio/Grafito Cepillado)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, outerR, 0, Math.PI * 2);
        
        let rimGrad = this.ctx.createRadialGradient(cx, cx, wheelR - 5, cx, cx, outerR);
        rimGrad.addColorStop(0, "#08090b");     // Receso oscuro interno
        rimGrad.addColorStop(0.15, "#1e2127");  // Brillo de metal de pizarra
        rimGrad.addColorStop(0.5, "#0f1013");   // Titanio oscuro cepillado
        rimGrad.addColorStop(0.85, "#2d313b");  // Brillo cromado exterior satinado
        rimGrad.addColorStop(1, "#07080a");     // Bisel de sombra exterior
        this.ctx.fillStyle = rimGrad;
        this.ctx.fill();
        
        // Borde dorado premium interno del aro
        this.ctx.strokeStyle = theme.primary;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        this.ctx.restore();

        // 2. Dibujar fondo oscuro de la rueda vacía
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, wheelR, 0, Math.PI * 2);
        let innerGrad = this.ctx.createRadialGradient(cx, cx, 0, cx, cx, wheelR);
        innerGrad.addColorStop(0, "#161616");
        innerGrad.addColorStop(1, "#0a0a0a");
        this.ctx.fillStyle = innerGrad;
        this.ctx.fill();
        this.ctx.restore();

        // 3. Dibujar texto instructivo elegante en el centro
        this.ctx.save();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = '900 28px "Segoe UI", system-ui, sans-serif';
        this.ctx.shadowColor = "rgba(0,0,0,0.8)";
        this.ctx.shadowBlur = 10;
        this.ctx.fillText("ESPERANDO PARTICIPANTES...", cx, cx - 20);
        
        this.ctx.fillStyle = theme.primary;
        this.ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
        this.ctx.fillText("REGÍSTRATE PARA INICIAR EL SORTEO", cx, cx + 25);
        this.ctx.restore();
    }

    /**
     * Dibuja el aro externo o llanta lujosa de la ruleta.
     */
    drawRim(cx: number, outerR: number, wheelR: number, theme: WheelTheme) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, outerR, 0, Math.PI * 2);
        
        let rimGrad = this.ctx.createRadialGradient(cx, cx, wheelR - 5, cx, cx, outerR);
        rimGrad.addColorStop(0, "#08090b");     // Receso oscuro interno
        rimGrad.addColorStop(0.15, "#1e2127");  // Brillo de metal de pizarra
        rimGrad.addColorStop(0.5, "#0f1013");   // Titanio oscuro cepillado
        rimGrad.addColorStop(0.85, "#2d313b");  // Brillo cromado exterior satinado
        rimGrad.addColorStop(1, "#07080a");     // Bisel de sombra exterior
        this.ctx.fillStyle = rimGrad;
        this.ctx.fill();
        
        // Borde dorado premium interno del aro (línea de acento temática con sombra)
        this.ctx.strokeStyle = theme.primary;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // Fina línea de brillo plateado exterior para realismo físico 3D
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, outerR - 1, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Dibuja cada segmento/rebanada (Slice) con su gradiente 3D y texto correspondiente.
     */
    drawSlices(cx: number, wheelR: number, theme: WheelTheme, prizes: WheelPrize[], sliceAngle: number) {
        let cumulativeAngle = this.angle;
        const prizeCount = prizes.length;
        
        prizes.forEach((p, i) => {
            this.ctx.save();
            this.ctx.beginPath();
            let fillColor = i % 2 ? theme.secondary : theme.primary;
            if (prizeCount % 2 !== 0 && i === prizeCount - 1) {
                fillColor = mixColors(theme.primary, theme.secondary);
            }
            
            // Gradiente radial para cada segmento dando sensación de volumen/curvatura 3D
            let sliceGrad = this.ctx.createRadialGradient(cx, cx, 80, cx, cx, wheelR);
            sliceGrad.addColorStop(0, mixColors(fillColor, "#ffffff", 0.12)); // Sutil núcleo de luz
            sliceGrad.addColorStop(0.6, fillColor);
            sliceGrad.addColorStop(1, mixColors(fillColor, "#000000", 0.20)); // Sombra suave contra el borde exterior
            
            this.ctx.fillStyle = sliceGrad;
            this.ctx.moveTo(cx, cx);
            this.ctx.arc(cx, cx, wheelR, cumulativeAngle, cumulativeAngle + sliceAngle);
            this.ctx.fill();
            
            // Líneas divisorias oscuras de profundidad
            this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Líneas de relieve metálico brillante sobre la divisoria
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cx);
            this.ctx.lineTo(cx + wheelR * Math.cos(cumulativeAngle), cx + wheelR * Math.sin(cumulativeAngle));
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            // Renderizado de texto con ajuste dinámico inteligente
            this.ctx.translate(cx, cx);
            this.ctx.rotate(cumulativeAngle + sliceAngle / 2);
            
            // Cálculo de tamaño de fuente ideal según la cantidad de opciones
            let fontSize = 42;
            if (prizeCount > 8) fontSize = 34;
            if (prizeCount > 12) fontSize = 28;
            if (prizeCount > 18) fontSize = 20;
            if (prizeCount > 24) fontSize = 15;
            
            // Reducir la fuente si el texto del premio es muy largo y evitar que se meta en el hueco central de la ruleta (radio 105, dejando margen hasta 145)
            const maxTextWidth = wheelR - 185; 
            this.ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
            let textWidth = this.ctx.measureText(p.name.toUpperCase()).width;
            if (textWidth > maxTextWidth) {
                fontSize = Math.floor(fontSize * (maxTextWidth / textWidth));
                if (fontSize < 12) fontSize = 12; // Límite inferior legible
                this.ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
            }
            
            this.ctx.textAlign = "right";
            this.ctx.fillStyle = "#ffffff";
            
            // Sombra para máxima legibilidad del texto corporativo
            this.ctx.shadowColor = "rgba(0,0,0,0.65)";
            this.ctx.shadowBlur = 6;
            
            this.ctx.fillText(p.name.toUpperCase(), wheelR - 40, 0);
            this.ctx.restore();
            
            cumulativeAngle += sliceAngle;
        });
    }

    /**
     * Dibuja la cúpula de cristal de la ruleta para un acabado fotorrealista.
     */
    drawGlassDome(cx: number, wheelR: number) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, wheelR, 0, Math.PI * 2);
        this.ctx.clip(); // Limitar el reflejo al disco
        
        let glassGrad = this.ctx.createLinearGradient(cx - wheelR, cx - wheelR, cx + wheelR, cx + wheelR);
        glassGrad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
        glassGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.05)");
        glassGrad.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        glassGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.05)");
        glassGrad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
        this.ctx.fillStyle = glassGrad;
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Dibuja el corte central transparente para alojar el botón interactivo con biseles 3D.
     */
    drawCenterHole(cx: number, theme: WheelTheme) {
        // Dibujar hueco circular transparente en el centro de la ruleta para alojar el botón
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, 105, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Dibujar un borde interior elegante de profundidad (un bisel metálico 3D) alrededor del hueco
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, 105, 0, Math.PI * 2);
        this.ctx.strokeStyle = theme.primary; // Color acento según el tema
        this.ctx.lineWidth = 6;
        this.ctx.stroke();

        // Línea sutil de brillo de bisel metálico para realismo 3D
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, 108, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Sombra de receso interna
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, 102, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Dibuja las luces LED perimetrales con parpadeo reactivo.
     */
    drawLEDs(cx: number, prizeCount: number, theme: WheelTheme) {
        const bulbCount = Math.max(16, prizeCount * 2);
        this.ctx.save();
        for (let b = 0; b < bulbCount; b++) {
            const bulbAngle = b * (Math.PI * 2 / bulbCount);
            // Las luces LED se sitúan en medio del aro exterior (radio de 462px)
            const bx = cx + 462 * Math.cos(bulbAngle);
            const by = cx + 462 * Math.sin(bulbAngle);
            
            // El patrón de parpadeo se sincroniza y acelera según la velocidad de la ruleta
            const blinkSpeed = this.isSpinning ? 12 : 3;
            const isLit = Math.floor((this.angle * blinkSpeed) + b) % 3 === 0;
            
            if (isLit) {
                // Aura brillante de luz LED externa
                this.ctx.beginPath();
                this.ctx.arc(bx, by, 12, 0, Math.PI * 2);
                let auraGrad = this.ctx.createRadialGradient(bx, by, 2, bx, by, 12);
                auraGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
                auraGrad.addColorStop(0.2, mixColors(theme.primary, "#ffffff", 0.55));
                auraGrad.addColorStop(0.6, theme.primary);
                auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                this.ctx.fillStyle = auraGrad;
                this.ctx.shadowColor = theme.primary;
                this.ctx.shadowBlur = 15;
                this.ctx.fill();
                
                // Diode de luz blanca puro central
                this.ctx.beginPath();
                this.ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
                this.ctx.fillStyle = "#ffffff";
                this.ctx.shadowColor = "#ffffff";
                this.ctx.shadowBlur = 8;
                this.ctx.fill();
            } else {
                // Diode apagado: cabujón de cristal oscuro reflectante
                this.ctx.beginPath();
                this.ctx.arc(bx, by, 6, 0, Math.PI * 2);
                let offGrad = this.ctx.createRadialGradient(bx - 1.5, by - 1.5, 1, bx, by, 6);
                offGrad.addColorStop(0, "#2c3540");
                offGrad.addColorStop(0.7, "#101317");
                offGrad.addColorStop(1, "#040506");
                this.ctx.fillStyle = offGrad;
                this.ctx.shadowBlur = 0;
                this.ctx.fill();
                
                // Bisel metálico fino elegante para encajar el LED
                this.ctx.beginPath();
                this.ctx.arc(bx, by, 6, 0, Math.PI * 2);
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
        this.ctx.restore();
    }

    /**
     * Lanza el giro físico de la ruleta hacia un premio específico.
     */
    async spin(targetIdx?: number, bypassAdCheck = false) {
        if (this.isSpinning) return;
        this.audio.init(); 
        
        if (this.onSpinStart) this.onSpinStart();

        // Lógica de Video Ads por frecuencia delegada al state manager
        const config = this.getGlobalConfig();
        if (!bypassAdCheck && config && config.adVideoAdsEnabled && config.adVideoAdsFrequency) {
            config.spinsSinceLastAd = (config.spinsSinceLastAd || 0) + 1;
            if (config.spinsSinceLastAd >= config.adVideoAdsFrequency) {
                config.spinsSinceLastAd = 0;
                this.saveGlobalConfig();
                if (this.onAdTrigger) this.onAdTrigger();
                return;
            }
        }

        this.isSpinning = true;
        
        let total = (Math.PI * 2 * 10) + (Math.random() * Math.PI * 2);
        const prizes = this.getPrizes();
        if (targetIdx !== undefined && targetIdx >= 0) {
            const prizeCount = prizes.length;
            if (prizeCount > 0) {
                const sliceAngle = (Math.PI * 2) / prizeCount;
                const targetNormalizedAngle = (targetIdx + 0.5) * sliceAngle;
                let finalAngle = (Math.PI * 1.5) - targetNormalizedAngle;
                while (finalAngle < 0) finalAngle += Math.PI * 2;
                total = (Math.PI * 2 * 10) + finalAngle;
            }
        }
        
        const start = performance.now();
        let lastTickSlice = -1;
        
        const anim = (now: number) => {
            const p = Math.min((now - start) / 5000, 1);
            this.angle = total * (1 - Math.pow(1 - p, 3));
            
            // Generar sonido táctil de clic de rueda (ticking) cuando cruza bordes de rebanada
            const prizeCount = prizes.length;
            if (prizeCount > 0) {
                const sliceAngle = (Math.PI * 2) / prizeCount;
                // Calculamos la rebanada que está pasando por el marcador superior (Math.PI * 1.5)
                const currentSlice = Math.floor((Math.PI * 1.5 - (this.angle % (Math.PI * 2))) / sliceAngle);
                if (currentSlice !== lastTickSlice) {
                    this.audio.playTick();
                    lastTickSlice = currentSlice;
                }
            }

            this.draw();
            if (p < 1) {
                requestAnimationFrame(anim);
            } else { 
                this.isSpinning = false; 
                this.finalize(); 
            }
        };
        requestAnimationFrame(anim);
    }

    /**
     * Finaliza la rotación de la rueda, seleccionando el ganador e invocando efectos y callbacks.
     */
    finalize() {
        try {
            const prizes = this.getPrizes();
            const prizeCount = prizes.length;
            if (prizeCount === 0) return;
            
            const sliceAngle = (Math.PI * 2) / prizeCount;
            // Ajuste de ángulo para que el puntero (superior, -90deg o 1.5PI) coincida con el slice correcto
            let normalizedAngle = (Math.PI * 1.5 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
            if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
            
            let idx = Math.floor(normalizedAngle / sliceAngle);
            idx = Math.max(0, Math.min(idx, prizeCount - 1));
            
            this.winnerIdx = idx;
            const premio = prizes[idx].name;
            
            try {
                this.audio.playWin();
            } catch (err) {
                console.error("Error de audio al ganar:", err);
            }
            
            try {
                this.confetti.burst();
            } catch (err) {
                console.error("Error de confeti al ganar:", err);
            }
            
            if (this.onSpinComplete) {
                this.onSpinComplete(premio);
            }
        } catch (e) {
            console.error("Error crítico en Wheel.finalize:", e);
        }
    }
}

export const appWheel = new Wheel();
// @ts-ignore
if (typeof window !== 'undefined') window.appWheel = appWheel;
