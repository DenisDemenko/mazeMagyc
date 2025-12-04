
class AudioManager {
  private ctx: AudioContext | null = null;
  private rollingSource: AudioBufferSourceNode | null = null;
  private rollingGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isInitialized = false;

  constructor() {
    // Singleton pattern effectively
  }

  init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.isInitialized = true;
  }

  // -- SOUND: Rolling (Continuous Noise) --
  startRolling() {
    if (!this.ctx) return;

    // Create White Noise Buffer
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Source
    this.rollingSource = this.ctx.createBufferSource();
    this.rollingSource.buffer = buffer;
    this.rollingSource.loop = true;

    // Filter (LowPass to make it sound like rolling on stone)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 100; // Start muffled

    // Gain
    this.rollingGain = this.ctx.createGain();
    this.rollingGain.gain.value = 0;

    // Connect
    this.rollingSource.connect(this.filterNode);
    this.filterNode.connect(this.rollingGain);
    this.rollingGain.connect(this.ctx.destination);

    this.rollingSource.start();
  }

  updateRolling(speed: number) {
    if (!this.ctx || !this.filterNode || !this.rollingGain) return;

    // Speed is roughly 0 to 15
    const normalizedSpeed = Math.min(speed / 10, 1);

    // Volume increases with speed
    // Smooth transition to avoid clicking
    this.rollingGain.gain.setTargetAtTime(normalizedSpeed * 0.3, this.ctx.currentTime, 0.1);

    // Pitch/Texture changes with speed (filter opens up)
    // Base 60Hz + up to 400Hz extra
    const targetFreq = 60 + (normalizedSpeed * 500); 
    this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  stopRolling() {
    if (this.rollingSource) {
      try {
        this.rollingSource.stop();
      } catch (e) {}
      this.rollingSource = null;
    }
  }

  // -- SOUND: Collision (Percussive Thud) --
  playCollision(intensity: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Low frequency triangle wave for "thud"
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);

    // Volume based on impact intensity
    const vol = Math.min(intensity * 0.1, 0.8);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(t + 0.2);
  }

  // -- SOUND: Bridge Boost (Sci-fi Whoosh) --
  playBridgeEnter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Sawtooth for energy sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(400, t + 0.3); // Pitch up

    // Lowpass filter opening up
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(2000, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(t + 0.5);
  }

  // -- SOUND: Teleport (Warp) --
  playTeleport() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Rapid frequency sweep down then up
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.5); // Down
    osc.frequency.exponentialRampToValueAtTime(1000, t + 1.0); // Up rapid

    // Tremolo effect
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 20;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 500; 
    lfo.connect(lfoGain);
    // lfoGain.connect(osc.frequency); // Optional: adds grit

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(t + 1.0);
  }

  // -- SOUND: Key Pickup (High Chime) --
  playKeyPickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(t + 0.3);
  }

  // -- SOUND: Barrier Open (Power Down) --
  playBarrierOpen() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.linearRampToValueAtTime(50, t + 0.5);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.5);
  }

  // -- SOUND: Meow (Kitten) --
  playMeow() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High pitched sine wave gliding down
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);
    osc.frequency.linearRampToValueAtTime(600, t + 0.4);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(t + 0.4);
  }

  // -- SOUND: Robot Spawn (Digital Glitch) --
  playRobotSpawn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.1);
    osc.frequency.linearRampToValueAtTime(200, t + 0.2);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(t + 0.3);
  }

  // -- SOUND: Win (Arpeggio) --
  playWin() {
    if (!this.ctx) return;
    this.stopRolling();
    
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        const startTime = t + i * 0.15;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.0);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 1.5);
    });
  }
}

export const audioManager = new AudioManager();
