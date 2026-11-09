export const CyberAudio = {
    ctx: null,
    muted: false,

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    playTone(freqStart, freqEnd, duration = 0.1, type = 'sawtooth', vol = 0.08) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    },

    playNoise(duration = 0.2, vol = 0.12, filterFreq = 900) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    },

    shoot(weaponKey) {
        switch (weaponKey) {
            case 'Pistol':
                this.playTone(580, 140, 0.09, 'square', 0.07);
                break;
            case 'Shotgun':
                this.playNoise(0.16, 0.14, 1400);
                this.playTone(240, 55, 0.14, 'sawtooth', 0.09);
                break;
            case 'Rifle':
                this.playTone(720, 180, 0.06, 'sawtooth', 0.06);
                break;
            case 'Sniper':
                this.playTone(1350, 90, 0.24, 'triangle', 0.12);
                this.playNoise(0.18, 0.1, 2400);
                break;
            case 'Launcher':
                this.playTone(210, 65, 0.18, 'sine', 0.12);
                break;
            case 'Plasma':
                this.playNoise(0.05, 0.04, 650);
                break;
            default:
                this.playTone(440, 120, 0.08, 'square', 0.06);
        }
    },

    explosion() {
        this.playNoise(0.38, 0.22, 750);
        this.playTone(130, 28, 0.35, 'sawtooth', 0.14);
    },

    dash() {
        this.playTone(320, 880, 0.11, 'sine', 0.08);
    },

    jumpPad() {
        this.playTone(220, 960, 0.22, 'triangle', 0.1);
    },

    pickup() {
        this.playTone(520, 1040, 0.08, 'sine', 0.06);
    },

    powerup() {
        this.playTone(440, 880, 0.12, 'triangle', 0.09);
        setTimeout(() => this.playTone(660, 1320, 0.15, 'triangle', 0.09), 70);
    },

    bossAlert() {
        this.playTone(180, 90, 0.35, 'sawtooth', 0.14);
        setTimeout(() => this.playTone(160, 75, 0.4, 'sawtooth', 0.14), 220);
    },

    ultimateCharge() {
        this.playTone(100, 800, 1.5, 'sine', 0.15);
    },

    ultimateExplosion() {
        this.playNoise(0.6, 0.3, 400);
        this.playTone(100, 20, 0.8, 'sawtooth', 0.25);
    }
};

export default CyberAudio;
