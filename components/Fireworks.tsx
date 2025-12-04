
import React, { useEffect, useRef } from 'react';

export const Fireworks: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    // Physics constants
    const GRAVITY = 0.04;
    const FRICTION = 0.98;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      decay: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        // Explosion burst velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.color = color;
        this.decay = Math.random() * 0.015 + 0.01;
      }

      update() {
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Rocket {
      x: number;
      y: number;
      vy: number;
      color: string;
      exploded: boolean;

      constructor() {
        this.x = Math.random() * width;
        this.y = height;
        // Shoot up
        this.vy = -(Math.random() * 6 + 10); 
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 60%)`;
        this.exploded = false;
      }

      update() {
        this.y += this.vy;
        this.vy += GRAVITY;
        
        // Explode when it starts to slow down or randomly near top
        if (this.vy > -2) {
          this.exploded = true;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];

    const loop = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
      ctx.fillRect(0, 0, width, height);

      // Randomly launch rockets
      if (Math.random() < 0.05) {
        rockets.push(new Rocket());
      }

      // Update Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].update();
        rockets[i].draw(ctx);

        if (rockets[i].exploded) {
          // Create explosion
          const particleCount = 80;
          for (let j = 0; j < particleCount; j++) {
            particles.push(new Particle(rockets[i].x, rockets[i].y, rockets[i].color));
          }
          rockets.splice(i, 1);
        } else if (rockets[i].y > height) {
           // Clean up if it somehow fell back down without exploding
           rockets.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none" />;
};
