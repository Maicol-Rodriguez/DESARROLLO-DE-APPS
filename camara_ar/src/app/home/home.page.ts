import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

declare const Hands: any;
declare const Camera: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [],
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private camera: any;

  async ngAfterViewInit(): Promise<void> {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;

    const hands = new Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((r: any) => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(r.image, 0, 0, canvas.width, canvas.height);

      const punta = r.multiHandLandmarks?.[0]?.[8];
      if (punta) {
        ctx.beginPath();
        ctx.arc(punta.x * canvas.width, punta.y * canvas.height, 50, 0, 30 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 10)';
        ctx.fill();
      }
    });

    await hands.initialize();

    this.camera = new Camera(video, {
      onFrame: async () => await hands.send({ image: video }),
      width: 1080,
      height: 1080,
    });
    this.camera.start();
  }

  ngOnDestroy(): void {
    this.camera?.stop();
  }
}




// version cubo



// import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

// declare const Hands: any;
// declare const Camera: any;
// declare const THREE: any;

// @Component({
//   selector: 'app-home',
//   templateUrl: 'home.page.html',
//   styleUrls: ['home.page.scss'],
//   imports: [],
// })
// export class HomePage implements AfterViewInit, OnDestroy {
//   @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
//   @ViewChild('threeCanvas') threeCanvas!: ElementRef<HTMLCanvasElement>;

//   private camera: any;
//   private renderer: any;
//   private animationId = 0;
//   private cube: any;
//   private targetX = 0;
//   private targetY = 0;
//   private visible = false;

//   async ngAfterViewInit(): Promise<void> {
//     const video = this.videoElement.nativeElement;
//     const canvas3d = this.threeCanvas.nativeElement;
//     const w = window.innerWidth;
//     const h = window.innerHeight;

//     // --- Configuracion de la escena 3D ---
//     const scene = new THREE.Scene();
//     const camera3d = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
//     camera3d.position.z = 500;

//     this.renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true });
//     this.renderer.setSize(w, h);

//     const geometry = new THREE.BoxGeometry(80, 150, 80);
//     const material = new THREE.MeshNormalMaterial(); // colorea cada cara distinto, sin necesitar luces
//     this.cube = new THREE.Mesh(geometry, material);
//     this.cube.visible = false;
//     scene.add(this.cube);

//     // --- Bucle de renderizado, independiente de la deteccion de mano ---
//     const animate = () => {
//       this.animationId = requestAnimationFrame(animate);
//       if (this.visible) {
//         this.cube.visible = true;
//         this.cube.rotation.x += 0.02;
//         this.cube.rotation.y += 0.02;
//         this.cube.position.x += (this.targetX - this.cube.position.x) * 0.3;
//         this.cube.position.y += (this.targetY - this.cube.position.y) * 0.3;
//       } else {
//         this.cube.visible = false;
//       }
//       this.renderer.render(scene, camera3d);
//     };
//     animate();

//     // --- MediaPipe Hands (deteccion de mano) ---
//     const hands = new Hands({
//       locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
//     });
//     hands.setOptions({
//       maxNumHands: 1,
//       modelComplexity: 1,
//       minDetectionConfidence: 0.6,
//       minTrackingConfidence: 0.6,
//     });

//     hands.onResults((r: any) => {
//       const punta = r.multiHandLandmarks?.[0]?.[8];
//       if (punta) {
//         this.visible = true;
//         this.targetX = (punta.x - 0.5) * w;
//         this.targetY = -(punta.y - 0.5) * h;
//       } else {
//         this.visible = false;
//       }
//     });

//     await hands.initialize();

//     this.camera = new Camera(video, {
//       onFrame: async () => await hands.send({ image: video }),
//       width: 640,
//       height: 480,
//     });
//     this.camera.start();
//   }

//   ngOnDestroy(): void {
//     this.camera?.stop();
//     cancelAnimationFrame(this.animationId);
//   }
// }









// rorbot



// // nueva verison
// import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

// declare const Hands: any;
// declare const Camera: any;
// declare const THREE: any;

// @Component({
//   selector: 'app-home',
//   templateUrl: 'home.page.html',
//   styleUrls: ['home.page.scss'],
//   imports: [],
// })
// export class HomePage implements AfterViewInit, OnDestroy {
//   @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
//   @ViewChild('threeCanvas') threeCanvas!: ElementRef<HTMLCanvasElement>;

//   private camera: any;
//   private renderer: any;
//   private animationId = 0;
//   private character: any;
//   private mixer: any;
//   private clock: any;
//   private targetX = 0;
//   private targetY = 0;
//   private visible = false;

//   async ngAfterViewInit(): Promise<void> {
//     const video = this.videoElement.nativeElement;
//     const canvas3d = this.threeCanvas.nativeElement;
//     const w = window.innerWidth;
//     const h = window.innerHeight;

//     // --- Escena 3D ---
//     const scene = new THREE.Scene();
//     const camera3d = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
//     camera3d.position.z = 500;

//     scene.add(new THREE.AmbientLight(0xffffff, 1.2));
//     const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     dirLight.position.set(0, 200, 300);
//     scene.add(dirLight);

//     this.renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true });
//     this.renderer.setSize(w, h);
//     this.clock = new THREE.Clock();

//     // --- Cargar el personaje animado (modelo libre, incluido en Three.js) ---
//     const loader = new THREE.GLTFLoader();
//     loader.load(
//       'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
//          (gltf: any) => {
//         const model = gltf.scene;

//         // Centrar y escalar el modelo a un tamaño razonable en pantalla
//         const box = new THREE.Box3().setFromObject(model);
//         const size = new THREE.Vector3();
//         box.getSize(size);
//         const center = new THREE.Vector3();
//         box.getCenter(center);
//         model.position.sub(center); // centra el modelo en su propio origen

//         const group = new THREE.Group();
//         group.add(model);
//         const scale = 180 / size.y; // altura objetivo: 180px en pantalla
//         group.scale.setScalar(scale);
//         group.visible = false;

//         this.mixer = new THREE.AnimationMixer(model);
//         const clip = gltf.animations.find((a: any) => a.name === 'Dance') ?? gltf.animations[0];
//         if (clip) {
//           this.mixer.clipAction(clip).play();
//         }

//         this.character = group;
//         scene.add(group);
//       },
//       undefined,
//       (err: any) => console.error('Error cargando el modelo 3D', err),
//     );

//     // --- Bucle de renderizado ---
//     const animate = () => {
//       this.animationId = requestAnimationFrame(animate);
//       const delta = this.clock.getDelta();
//       if (this.mixer) this.mixer.update(delta);

//       if (this.character) {
//         this.character.visible = this.visible;
//         if (this.visible) {
//           this.character.position.x += (this.targetX - this.character.position.x) * 0.3;
//           this.character.position.y += (this.targetY - this.character.position.y) * 0.3;
//         }
//       }
//       this.renderer.render(scene, camera3d);
//     };
//     animate();

//     // --- MediaPipe Hands ---
//     const hands = new Hands({
//       locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
//     });
//     hands.setOptions({
//       maxNumHands: 1,
//       modelComplexity: 1,
//       minDetectionConfidence: 0.6,
//       minTrackingConfidence: 0.6,
//     });

//     hands.onResults((r: any) => {
//       const lm = r.multiHandLandmarks?.[0];
//       if (lm) {
//         // Centro aproximado de la palma: promedio de muñeca y las 4 bases de los dedos
//         const palmIds = [8];
//         let px = 0, py = 0;
//         palmIds.forEach((i) => { px += lm[i].x; py += lm[i].y; });
//         px /= palmIds.length;
//         py /= palmIds.length;

//         this.visible = true;
//         this.targetX = (px - 0.5) * w;
//         this.targetY = -(py - 0.5) * h;
//       } else {
//         this.visible = false;
//       }
//     });

//     await hands.initialize();

//     this.camera = new Camera(video, {
//       onFrame: async () => await hands.send({ image: video }),
//       width: 640,
//       height: 480,
//     });
//     this.camera.start();
//   }

//   ngOnDestroy(): void {
//     this.camera?.stop();
//     cancelAnimationFrame(this.animationId);
//   }
// }