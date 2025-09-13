import { useEffect, useRef } from 'react';

interface HyperspeedEffectOptions {
  onSpeedUp?: () => void;
  onSlowDown?: () => void;
  distortion?: string;
  length?: number;
  roadWidth?: number;
  islandWidth?: number;
  lanesPerRoad?: number;
  fov?: number;
  fovSpeedUp?: number;
  speedUp?: number;
  carLightsFade?: number;
  totalSideLightSticks?: number;
  lightPairsPerRoadWay?: number;
  shoulderLinesWidthPercentage?: number;
  brokenLinesWidthPercentage?: number;
  brokenLinesLengthPercentage?: number;
  lightStickWidth?: [number, number];
  lightStickHeight?: [number, number];
  movingAwaySpeed?: [number, number];
  movingCloserSpeed?: [number, number];
  carLightsLength?: [number, number];
  carLightsRadius?: [number, number];
  carWidthPercentage?: [number, number];
  carShiftX?: [number, number];
  carFloorSeparation?: [number, number];
  colors?: {
    roadColor?: number;
    islandColor?: number;
    background?: number;
    shoulderLines?: number;
    brokenLines?: number;
    leftCars?: number[];
    rightCars?: number[];
    sticks?: number;
  };
}

interface HyperspeedProps {
  effectOptions?: HyperspeedEffectOptions;
}

const Hyperspeed: React.FC<HyperspeedProps> = ({
  effectOptions = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Default options
  const defaultOptions: HyperspeedEffectOptions = {
    onSpeedUp: () => {},
    onSlowDown: () => {},
    distortion: 'turbulentDistortion',
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 4,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],
    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],
    carLightsLength: [400 * 0.03, 400 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],
    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x000000,
      shoulderLines: 0xFFFFFF,
      brokenLines: 0xFFFFFF,
      leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
      rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
      sticks: 0x03B3C3,
    }
  };

  const options = { ...defaultOptions, ...effectOptions };

  // Car light class
  class CarLight {
    x: number;
    y: number;
    z: number;
    color: string;
    speed: number;
    radius: number;
    length: number;
    
    constructor(x: number, y: number, z: number, color: string, speed: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.color = color;
      this.speed = speed;
      this.radius = Math.random() * 0.1 + 0.05;
      this.length = Math.random() * 100 + 50;
    }
    
    update(deltaTime: number) {
      this.z += this.speed * deltaTime;
    }
    
    draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
      if (this.z < 0 || this.z > options.length!) return;
      
      const perspective = 1 / (this.z / options.length! + 0.1);
      const screenX = width / 2 + this.x * perspective * 100;
      const screenY = height / 2 + this.y * perspective * 50;
      const size = this.radius * perspective * 20;
      
      if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) return;
      
      // Trail effect
      const gradient = ctx.createLinearGradient(
        screenX, screenY,
        screenX, screenY + this.length * perspective * 0.5
      );
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, this.color + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(screenX - size/2, screenY, size, this.length * perspective * 0.5);
      
      // Main light
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Light stick class
  class LightStick {
    x: number;
    y: number;
    z: number;
    height: number;
    width: number;
    
    constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.height = Math.random() * 0.4 + 1.3;
      this.width = Math.random() * 0.38 + 0.12;
    }
    
    draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
      if (this.z < 0 || this.z > options.length!) return;
      
      const perspective = 1 / (this.z / options.length! + 0.1);
      const screenX = width / 2 + this.x * perspective * 100;
      const screenY = height / 2 + this.y * perspective * 50;
      const stickWidth = this.width * perspective * 10;
      const stickHeight = this.height * perspective * 30;
      
      if (screenX < 0 || screenX > width) return;
      
      // Stick
      ctx.fillStyle = `#${options.colors!.sticks!.toString(16).padStart(6, '0')}`;
      ctx.fillRect(screenX - stickWidth/2, screenY - stickHeight, stickWidth, stickHeight);
      
      // Glow
      const gradient = ctx.createRadialGradient(
        screenX, screenY - stickHeight/2, 0,
        screenX, screenY - stickHeight/2, stickWidth * 3
      );
      gradient.addColorStop(0, `#${options.colors!.sticks!.toString(16).padStart(6, '0')}80`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(screenX - stickWidth*3, screenY - stickHeight, stickWidth*6, stickHeight);
    }
  }

  // Simulation state
  const carLights: CarLight[] = [];
  const lightSticks: LightStick[] = [];
  let time = 0;

  // Initialize
  const init = () => {
    // Create car lights
    for (let i = 0; i < 50; i++) {
      const isLeft = Math.random() > 0.5;
      const x = isLeft ? -2 : 2;
      const y = 0;
      const z = Math.random() * options.length!;
      const colors = isLeft ? options.colors!.leftCars! : options.colors!.rightCars!;
      const color = `#${colors[Math.floor(Math.random() * colors.length)].toString(16).padStart(6, '0')}`;
      const speed = isLeft ? 
        Math.random() * 20 + 60 : 
        Math.random() * -40 - 120;
      
      carLights.push(new CarLight(x, y, z, color, speed));
    }
    
    // Create light sticks
    for (let i = 0; i < options.totalSideLightSticks!; i++) {
      const x = Math.random() > 0.5 ? -5 : 5;
      const y = 0;
      const z = (i / options.totalSideLightSticks!) * options.length!;
      
      lightSticks.push(new LightStick(x, y, z));
    }
  };

  // Render function
  const render = (deltaTime: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    time += deltaTime;
    
    // Clear with background
    ctx.fillStyle = `#${options.colors!.background!.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw road
    const roadGradient = ctx.createLinearGradient(0, canvas.height/2, 0, canvas.height);
    roadGradient.addColorStop(0, `#${options.colors!.roadColor!.toString(16).padStart(6, '0')}`);
    roadGradient.addColorStop(1, `#${options.colors!.roadColor!.toString(16).padStart(6, '0')}80`);
    
    // Perspective road shape
    const roadTop = canvas.height * 0.4;
    const roadBottom = canvas.height;
    const roadWidthTop = 50;
    const roadWidthBottom = canvas.width * 0.8;
    
    ctx.fillStyle = roadGradient;
    ctx.beginPath();
    ctx.moveTo(canvas.width/2 - roadWidthTop/2, roadTop);
    ctx.lineTo(canvas.width/2 + roadWidthTop/2, roadTop);
    ctx.lineTo(canvas.width/2 + roadWidthBottom/2, roadBottom);
    ctx.lineTo(canvas.width/2 - roadWidthBottom/2, roadBottom);
    ctx.closePath();
    ctx.fill();
    
    // Draw road lines
    ctx.strokeStyle = `#${options.colors!.brokenLines!.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 2;
    
    // Center line (moving dashes)
    const dashLength = 20;
    const dashGap = 40;
    const lineOffset = (time * 200) % (dashLength + dashGap);
    
    for (let i = -lineOffset; i < canvas.height - roadTop; i += dashLength + dashGap) {
      const progress = i / (canvas.height - roadTop);
      const x = canvas.width / 2;
      const y1 = roadTop + i;
      const y2 = roadTop + i + dashLength;
      const width = roadWidthTop + (roadWidthBottom - roadWidthTop) * progress;
      
      if (y2 > roadTop && y1 < canvas.height) {
        ctx.beginPath();
        ctx.moveTo(x, Math.max(y1, roadTop));
        ctx.lineTo(x, Math.min(y2, canvas.height));
        ctx.stroke();
      }
    }
    
    // Update and draw car lights
    carLights.forEach(light => {
      light.update(deltaTime);
      
      // Reset position if out of bounds
      if (light.z > options.length! || light.z < -50) {
        light.z = light.speed > 0 ? -50 : options.length!;
      }
      
      light.draw(ctx, canvas.width, canvas.height);
    });
    
    // Draw light sticks
    lightSticks.forEach(stick => {
      stick.draw(ctx, canvas.width, canvas.height);
    });
    
    // Add atmosphere/particles
    ctx.fillStyle = '#ffffff10';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      ctx.fillRect(x, y, size, size);
    }
  };

  // Animation loop
  useEffect(() => {
    let lastTime = 0;
    
    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.016);
      lastTime = currentTime;
      
      render(deltaTime);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    init();
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default Hyperspeed;