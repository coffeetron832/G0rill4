// --- Clase Motor de Físicas del Banano ---
class BananaPhysics {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

    // Asegurar que el canvas NO bloquee la interfaz por defecto
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9998';

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    this.x = 0;
    this.y = -50;
    this.vx = 0;
    this.vy = 0;
    this.radius = 24;
    this.gravity = 0.6;
    this.bounce = -0.55;
    this.friction = 0.98;

    this.isDragging = false;
    this.isEaten = true;
    this.animId = null;
    this.gorillaEl = null;
    this.lastTime = 0;

    // Crear elemento para el Tooltip explicativo
    this.createTooltip();

    window.addEventListener('resize', () => this.resizeCanvas());
    this.bindGlobalEvents();
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'bananaTooltip';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '9999';
    this.tooltip.style.background = 'rgba(0, 0, 0, 0.75)';
    this.tooltip.style.color = '#fff';
    this.tooltip.style.padding = '4px 8px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.fontWeight = 'bold';
    this.tooltip.style.whiteSpace = 'nowrap';
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transition = 'opacity 0.2s ease';
    this.tooltip.innerHTML = '🍌 ¡Arrástrame hacia el gorila!';
    document.body.appendChild(this.tooltip);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawn(gorillaElement) {
    this.gorillaEl = gorillaElement;
    this.x = Math.random() * (this.canvas.width - 120) + 60;
    this.y = -40;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = 2;
    this.isEaten = false;
    this.isDragging = false;
    this.lastTime = performance.now();

    // Mostrar tooltip
    if (this.tooltip) this.tooltip.style.opacity = '1';

    if (!this.animId) this.loop(performance.now());
  }

  bindGlobalEvents() {
    const getPos = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX, y: clientY };
    };

    const startDrag = (e) => {
      if (this.isEaten) return;
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - this.x, pos.y - this.y);
      
      // Permitir el agarre dentro del radio del banano sin bloquear los clics fuera de él
      if (dist < this.radius + 15) {
        this.isDragging = true;
        this.dragOffsetX = pos.x - this.x;
        this.dragOffsetY = pos.y - this.y;
      }
    };

    const moveDrag = (e) => {
      if (this.isDragging) {
        const pos = getPos(e);
        this.vx = (pos.x - this.dragOffsetX - this.x) * 0.3;
        this.vy = (pos.y - this.dragOffsetY - this.y) * 0.3;
        this.x = pos.x - this.dragOffsetX;
        this.y = pos.y - this.dragOffsetY;
      }
    };

    const stopDrag = () => {
      this.isDragging = false;
    };

    // Escuchar eventos globales sin interceptar el resto de la interfaz
    window.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    window.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', moveDrag, { passive: true });
    window.addEventListener('touchend', stopDrag);
  }

  checkGorillaCollision() {
    if (!this.gorillaEl || this.isEaten) return;

    const rect = this.gorillaEl.getBoundingClientRect();
    if (
      this.x > rect.left - 10 &&
      this.x < rect.right + 10 &&
      this.y > rect.top - 10 &&
      this.y < rect.bottom + 10
    ) {
      this.isEaten = true;
      this.triggerGorillaEatEffect();
    }
  }

  triggerGorillaEatEffect() {
    playEatSound();
    
    // Ocultar tooltip
    if (this.tooltip) this.tooltip.style.opacity = '0';

    if (this.gorillaEl) {
      this.gorillaEl.style.transform = 'scale(1.4)';
      this.gorillaEl.style.transition = 'transform 0.2s ease';
    }

    setTimeout(() => {
      if (this.gorillaEl) this.gorillaEl.style.transform = 'scale(1)';
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }, 400);
  }

  update(dt) {
    if (this.isEaten) return;

    const factor = Math.min(dt / 16.66, 2.0);

    if (!this.isDragging) {
      this.vy += this.gravity * factor;
      this.vx *= Math.pow(this.friction, factor);
      this.vy *= Math.pow(this.friction, factor);

      this.x += this.vx * factor;
      this.y += this.vy * factor;

      const floor = this.canvas.height - this.radius - 10;
      if (this.y > floor) {
        this.y = floor;
        this.vy *= this.bounce;
      }

      if (this.x < this.radius || this.x > this.canvas.width - this.radius) {
        this.vx *= -1;
      }
    }

    // Actualizar posición del Tooltip flotando sobre el banano
    if (this.tooltip) {
      this.tooltip.style.left = `${this.x}px`;
      this.tooltip.style.top = `${this.y - 45}px`;
      this.tooltip.style.transform = 'translateX(-50%)';
    }

    this.checkGorillaCollision();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.isEaten) {
      this.ctx.font = '36px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🍌', this.x, this.y);
    }
  }

  loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt || 16.66);
    this.draw();

    if (!this.isEaten) {
      this.animId = requestAnimationFrame((t) => this.loop(t));
    } else {
      this.animId = null;
    }
  }
}
