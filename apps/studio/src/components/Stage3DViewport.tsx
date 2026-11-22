import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { Camera, Layers, Box, Eye, Move, RotateCw, Maximize2, Download, Grid2X2 } from 'lucide-react';
import type { StageObject3D, MannequinPose, StageRenderMode } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

function buildMannequinGroup(obj: StageObject3D): THREE.Group {
  const root = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color || '#60a5fa'),
    roughness: 0.42,
    metalness: 0.15,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.25,
  });

  const pose: MannequinPose | undefined = obj.pose;

  const hips = new THREE.Group();
  hips.position.set(0, 0.95, 0);
  root.add(hips);
  hips.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.2), baseMat));

  const spine = new THREE.Group();
  spine.position.set(0, 0.1, 0);
  if (pose) spine.rotation.set(pose.spine.x, pose.spine.y, pose.spine.z);
  hips.add(spine);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.22), baseMat);
  torsoMesh.position.set(0, 0.24, 0);
  spine.add(torsoMesh);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.52, 0);
  if (pose) headGroup.rotation.set(pose.head.x, pose.head.y, pose.head.z);
  spine.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 12), jointMat);
  neck.position.set(0, 0.04, 0);
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 16), baseMat);
  head.position.set(0, 0.2, 0);
  head.scale.set(0.92, 1.12, 0.98);
  headGroup.add(head);

  const makeArm = (side: -1 | 1, shoulderRot?: { x: number; y: number; z: number }, elbowRot?: { x: number; y: number; z: number }) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.24, 0.43, 0);
    if (shoulderRot) shoulder.rotation.set(shoulderRot.x, shoulderRot.y, shoulderRot.z);
    spine.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), jointMat));
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 12), baseMat);
    upperArm.position.set(0, -0.15, 0);
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    if (elbowRot) elbow.rotation.set(elbowRot.x, elbowRot.y, elbowRot.z);
    shoulder.add(elbow);

    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), jointMat));
    const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.035, 0.26, 12), baseMat);
    foreArm.position.set(0, -0.14, 0);
    elbow.add(foreArm);
  };

  makeArm(-1, pose?.leftShoulder, pose?.leftElbow);
  makeArm(1, pose?.rightShoulder, pose?.rightElbow);

  const makeLeg = (side: -1 | 1, hipRot?: { x: number; y: number; z: number }, kneeRot?: { x: number; y: number; z: number }) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.06, 0);
    if (hipRot) hip.rotation.set(hipRot.x, hipRot.y, hipRot.z);
    hips.add(hip);

    hip.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), jointMat));
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.42, 12), baseMat);
    thigh.position.set(0, -0.22, 0);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.44, 0);
    if (kneeRot) knee.rotation.set(kneeRot.x, kneeRot.y, kneeRot.z);
    hip.add(knee);

    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), jointMat));
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.42, 12), baseMat);
    shin.position.set(0, -0.22, 0);
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.19), jointMat);
    foot.position.set(0, -0.44, 0.05);
    knee.add(foot);
  };

  makeLeg(-1, pose?.leftHip, pose?.leftKnee);
  makeLeg(1, pose?.rightHip, pose?.rightKnee);

  return root;
}

function buildExtrudedSvgGroup(svgString: string, depth: number, fallbackColor: string): THREE.Group {
  const group = new THREE.Group();
  try {
    const loader = new SVGLoader();
    const data = loader.parse(svgString);
    for (const path of data.paths) {
      const fill = path.userData?.style?.fill;
      if (fill === 'none') continue;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(fill && fill.startsWith('#') ? fill : fallbackColor),
        roughness: 0.35,
        metalness: 0.25,
      });
      const shapes = SVGLoader.createShapes(path);
      for (const shape of shapes) {
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.5 });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
      }
    }
    group.scale.set(0.0028, -0.0028, 0.015);
    group.position.set(-1.3, 1.3, 0);
  } catch {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.3), new THREE.MeshStandardMaterial({ color: fallbackColor })));
  }
  return group;
}

function buildReliefMeshGroup(imageUrl: string): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(2.2, 2.2, 48, 48);
  const tex = new THREE.TextureLoader().load(imageUrl);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const off = document.createElement('canvas');
    off.width = 49;
    off.height = 49;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 49, 49);
    const data = ctx.getImageData(0, 0, 49, 49).data;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const idx = i * 4;
      const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
      pos.setZ(i, lum * 0.45);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  img.src = imageUrl;
  return group;
}

export function Stage3DViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const objectNodesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    key: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
  } | null>(null);
  const depthMatRef = useRef<THREE.MeshDepthMaterial | null>(null);
  const normalMatRef = useRef<THREE.MeshNormalMaterial | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const project = useStudioStore((s) => s.project);
  const stageRenderMode = useStudioStore((s) => s.stageRenderMode);
  const setStageRenderMode = useStudioStore((s) => s.setStageRenderMode);
  const transformGizmoMode = useStudioStore((s) => s.transformGizmoMode);
  const setTransformGizmoMode = useStudioStore((s) => s.setTransformGizmoMode);
  const selectedObject3DId = useStudioStore((s) => s.selectedObject3DId);
  const setSelectedObject3DId = useStudioStore((s) => s.setSelectedObject3DId);
  const update3DObject = useStudioStore((s) => s.update3DObject);
  const registerStageCapture = useStudioStore((s) => s.registerStageCapture);
  const registerStageExporters = useStudioStore((s) => s.registerStageExporters);
  const captureStageTo2DLayer = useStudioStore((s) => s.captureStageTo2DLayer);
  const captureStageToAI = useStudioStore((s) => s.captureStageToAI);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const setViewportMode = useStudioStore((s) => s.setViewportMode);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL başlatılamadı');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth || 640, el.clientHeight || 480);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1018');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 640) / (el.clientHeight || 480), 0.25, 45);
    camera.position.set(2.6, 2.1, 4.4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enableDamping = true;
    controls.update();
    orbitRef.current = controls;

    // 3D TransformControls Gizmo
    const tControls = new TransformControls(camera, renderer.domElement);
    tControls.addEventListener('dragging-changed', (ev) => {
      controls.enabled = !ev.value;
    });
    tControls.addEventListener('objectChange', () => {
      const attached = tControls.object;
      const objId = attached?.userData?.objectId as string | undefined;
      if (!attached || !objId) return;
      update3DObject(objId, {
        position: {
          x: +attached.position.x.toFixed(2),
          y: +attached.position.y.toFixed(2),
          z: +attached.position.z.toFixed(2),
        },
        rotation: {
          x: +attached.rotation.x.toFixed(2),
          y: +attached.rotation.y.toFixed(2),
          z: +attached.rotation.z.toFixed(2),
        },
        scale: {
          x: +attached.scale.x.toFixed(2),
          y: +attached.scale.y.toFixed(2),
          z: +attached.scale.z.toFixed(2),
        },
      });
    });
    scene.add(tControls.getHelper());
    transformRef.current = tControls;

    // Lighting rig
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.6);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);
    lightsRef.current = { ambient, key: keyLight, rim: rimLight };

    const grid = new THREE.GridHelper(16, 16, 0x334155, 0x1e293b);
    scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.9, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.005;
    floor.receiveShadow = true;
    scene.add(floor);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    depthMatRef.current = new THREE.MeshDepthMaterial();
    normalMatRef.current = new THREE.MeshNormalMaterial();

    // Raycast click to select 3D object directly in viewport
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(dynamicGroup.children, true);
      for (const hit of hits) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && !curr.userData?.objectId) {
          curr = curr.parent;
        }
        if (curr?.userData?.objectId) {
          setSelectedObject3DId(curr.userData.objectId);
          break;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(el);

    registerStageCapture(() => {
      const prevOverride = scene.overrideMaterial;
      const prevBg = scene.background;
      const prevNear = camera.near;
      const prevFar = camera.far;
      const helper = tControls.getHelper();
      const prevHelperVis = helper.visible;
      helper.visible = false;

      scene.overrideMaterial = null;
      scene.background = new THREE.Color(useStudioStore.getState().project.stageLighting?.bgColor || '#0d1018');
      renderer.render(scene, camera);
      const rgbDataUrl = renderer.domElement.toDataURL('image/png');

      camera.near = 1.2;
      camera.far = 11.5;
      camera.updateProjectionMatrix();
      scene.overrideMaterial = depthMatRef.current;
      scene.background = new THREE.Color('#000000');
      renderer.render(scene, camera);
      const depthDataUrl = renderer.domElement.toDataURL('image/png');

      helper.visible = prevHelperVis;
      camera.near = prevNear;
      camera.far = prevFar;
      camera.updateProjectionMatrix();
      scene.overrideMaterial = prevOverride;
      scene.background = prevBg;
      renderer.render(scene, camera);

      return { rgbDataUrl, depthDataUrl };
    });

    registerStageExporters(
      () => {
        const exporter = new GLTFExporter();
        exporter.parse(
          dynamicGroup,
          (result) => {
            const blob =
              result instanceof ArrayBuffer
                ? new Blob([result], { type: 'model/gltf-binary' })
                : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result instanceof ArrayBuffer ? 'alpemox-stage.glb' : 'alpemox-stage.gltf';
            a.click();
            URL.revokeObjectURL(url);
          },
          () => {},
          { binary: true },
        );
      },
      () => {
        const exporter = new OBJExporter();
        const objText = exporter.parse(dynamicGroup);
        const blob = new Blob([objText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'alpemox-stage.obj';
        a.click();
        URL.revokeObjectURL(url);
      },
    );

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      registerStageCapture(null);
      registerStageExporters(null, null);
      tControls.dispose();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [registerStageCapture, registerStageExporters, setSelectedObject3DId, update3DObject]);

  // Sync gizmo mode
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformGizmoMode);
    }
  }, [transformGizmoMode]);

  // Sync stage lighting & fog
  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    const lighting = project.stageLighting;
    if (!scene || !lights || !lighting) return;
    lights.ambient.intensity = lighting.ambientIntensity;
    lights.key.intensity = lighting.keyIntensity;
    lights.key.color.set(lighting.keyColor);
    lights.rim.color.set(lighting.rimColor);
    if (stageRenderMode === 'lit' || stageRenderMode === 'wireframe') {
      scene.background = new THREE.Color(lighting.bgColor || '#0d1018');
      scene.fog = lighting.fogDensity > 0 ? new THREE.FogExp2(lighting.bgColor || '#0d1018', lighting.fogDensity) : null;
    }
  }, [project.stageLighting, stageRenderMode]);

  // Sync camera3d
  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.fov = project.camera3d.fov;
    cam.position.set(project.camera3d.position.x, project.camera3d.position.y, project.camera3d.position.z);
    cam.lookAt(project.camera3d.target.x, project.camera3d.target.y, project.camera3d.target.z);
    cam.updateProjectionMatrix();
    orbitRef.current?.update();
  }, [project.camera3d]);

  // Sync render mode
  useEffect(() => {
    const scene = sceneRef.current;
    const cam = cameraRef.current;
    if (!scene) return;
    if (stageRenderMode === 'depth') {
      if (cam) {
        cam.near = 1.2;
        cam.far = 11.5;
        cam.updateProjectionMatrix();
      }
      scene.overrideMaterial = depthMatRef.current;
      scene.background = new THREE.Color('#000000');
    } else if (stageRenderMode === 'normal') {
      if (cam) {
        cam.near = 0.25;
        cam.far = 45;
        cam.updateProjectionMatrix();
      }
      scene.overrideMaterial = normalMatRef.current;
      scene.background = new THREE.Color('#0f172a');
    } else {
      if (cam) {
        cam.near = 0.25;
        cam.far = 45;
        cam.updateProjectionMatrix();
      }
      scene.overrideMaterial = null;
      scene.background = new THREE.Color(project.stageLighting?.bgColor || '#0d1018');
    }
  }, [stageRenderMode, project.stageLighting?.bgColor]);

  // Rebuild dynamic objects
  useEffect(() => {
    const group = dynamicGroupRef.current;
    const tControls = transformRef.current;
    if (!group) return;
    if (tControls) tControls.detach();
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    objectNodesRef.current.clear();

    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    for (const obj of project.objects3d) {
      if (!obj.visible) continue;
      let node: THREE.Object3D;

      if (obj.kind === 'mannequin') {
        node = buildMannequinGroup(obj);
      } else if (obj.kind === 'relief' && obj.textureDataUrl) {
        node = buildReliefMeshGroup(obj.textureDataUrl);
      } else if (obj.kind === 'extrude' && obj.svgString) {
        node = buildExtrudedSvgGroup(obj.svgString, obj.extrudeDepth || 12, obj.color);
      } else if (obj.kind === 'billboard' && obj.textureDataUrl) {
        const tex = textureLoader.load(obj.textureDataUrl);
        const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
        node = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      } else if (obj.kind === 'glb' && obj.glbDataUrl) {
        const holder = new THREE.Group();
        gltfLoader.load(obj.glbDataUrl, (gltf) => {
          holder.add(gltf.scene);
        });
        node = holder;
      } else {
        const geo =
          obj.kind === 'sphere'
            ? new THREE.SphereGeometry(0.55, 24, 18)
            : obj.kind === 'cylinder'
              ? new THREE.CylinderGeometry(0.45, 0.45, 1.1, 20)
              : obj.kind === 'cone'
                ? new THREE.ConeGeometry(0.55, 1.15, 20)
                : obj.kind === 'torus'
                  ? new THREE.TorusGeometry(0.48, 0.16, 16, 36)
                  : new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(obj.color || '#38bdf8'),
          roughness: obj.roughness ?? 0.45,
          metalness: obj.metalness ?? 0.2,
          emissive: new THREE.Color(obj.color || '#000000'),
          emissiveIntensity: obj.emissiveIntensity ?? 0,
          wireframe: stageRenderMode === 'wireframe',
        });
        node = new THREE.Mesh(geo, mat);
      }

      if (stageRenderMode === 'wireframe') {
        node.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && 'wireframe' in mat) mat.wireframe = true;
          }
        });
      }

      node.userData.objectId = obj.id;
      node.position.set(obj.position.x, obj.position.y, obj.position.z);
      node.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
      node.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
      group.add(node);
      objectNodesRef.current.set(obj.id, node);

      if (obj.id === selectedObject3DId) {
        group.add(new THREE.BoxHelper(node, 0x38bdf8));
        if (tControls) tControls.attach(node);
      }
    }
  }, [project.objects3d, selectedObject3DId, stageRenderMode]);

  const setCameraOrbitAngle = (azimuthDeg: number, elevationDeg = 18, distance = 5.0) => {
    const cam = cameraRef.current;
    const ctrl = orbitRef.current;
    if (!cam || !ctrl) return;
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    const target = ctrl.target;
    cam.position.set(
      target.x + distance * Math.cos(el) * Math.sin(az),
      target.y + distance * Math.sin(el),
      target.z + distance * Math.cos(el) * Math.cos(az),
    );
    cam.lookAt(target);
    ctrl.update();
  };

  const capture4AngleTurnaround = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const cam = cameraRef.current;
    const ctrl = orbitRef.current;
    const tControls = transformRef.current;
    if (!renderer || !scene || !cam || !ctrl) return;

    const prevPos = cam.position.clone();
    const helper = tControls?.getHelper();
    const prevHelperVis = helper ? helper.visible : false;
    if (helper) helper.visible = false;

    const sheet = document.createElement('canvas');
    sheet.width = 1024;
    sheet.height = 1024;
    const ctx = sheet.getContext('2d');
    if (ctx) {
      const angles: Array<[string, number]> = [
        ['ON 0°', 0],
        ['SAG 90°', 90],
        ['ARKA 180°', 180],
        ['SOL 270°', 270],
      ];
      angles.forEach(([label, deg], idx) => {
        setCameraOrbitAngle(deg, 16, 4.6);
        renderer.render(scene, cam);
        const qx = (idx % 2) * 512;
        const qy = Math.floor(idx / 2) * 512;
        ctx.drawImage(renderer.domElement, qx, qy, 512, 512);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(qx + 12, qy + 12, 108, 28);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 14px monospace';
        ctx.fillText(label, qx + 22, qy + 31);
      });

      add2DLayer({
        name: '3D 4-Açı Turnaround',
        kind: 'raster',
        x: 0,
        y: 0,
        width: project.canvasWidth,
        height: project.canvasHeight,
        dataUrl: sheet.toDataURL('image/png'),
      });
      setViewportMode('photo');
    }

    cam.position.copy(prevPos);
    cam.lookAt(ctrl.target);
    ctrl.update();
    if (helper) helper.visible = prevHelperVis;
  };

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#0d1018]">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 bg-[#111521] px-2.5 py-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          <span className="font-semibold text-slate-200">3D Sahne</span>
          <div className="flex rounded border border-slate-800 bg-slate-900 p-0.5">
            {(
              [
                ['translate', Move, 'Taşı'],
                ['rotate', RotateCw, 'Döndür'],
                ['scale', Maximize2, 'Ölçekle'],
              ] as const
            ).map(([m, Icon, title]) => (
              <button
                key={m}
                onClick={() => setTransformGizmoMode(m)}
                title={title}
                className={`rounded p-1 ${
                  transformGizmoMode === m ? 'bg-sky-500/25 text-sky-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-0.5 rounded border border-slate-800 bg-slate-900 p-0.5 xl:flex">
            {(
              [
                ['Ön', 0, 15],
                ['45°', 45, 18],
                ['Yan', 90, 15],
                ['Arka', 180, 18],
                ['Üst', 20, 58],
                ['Alt', 25, -18],
              ] as const
            ).map(([label, az, el]) => (
              <button
                key={label}
                onClick={() => setCameraOrbitAngle(az, el)}
                title={`Kamera açısı: ${label}`}
                className="rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-sky-300"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <div className="flex rounded-md border border-slate-800 bg-slate-900/90 p-0.5">
            {(['lit', 'depth', 'normal', 'wireframe'] as StageRenderMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setStageRenderMode(m)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                  stageRenderMode === m ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'lit' ? 'PBR' : m === 'depth' ? 'Depth' : m === 'normal' ? 'Normal' : 'Wire'}
              </button>
            ))}
          </div>

          <button
            onClick={() => captureStageToAI()}
            className="flex items-center gap-1 rounded bg-sky-600/20 px-2 py-1 text-[10px] font-medium text-sky-300 hover:bg-sky-600/35"
          >
            <Camera className="h-3 w-3" />
            AI Ref
          </button>

          <button
            onClick={captureStageTo2DLayer}
            className="flex items-center gap-1 rounded bg-emerald-600/20 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-600/35"
          >
            <Layers className="h-3 w-3" />
            2D’ye At
          </button>

          <button
            onClick={capture4AngleTurnaround}
            title="Ön/Sağ/Arka/Sol 4 açı turnaround sheet yakalayıp Photo katmanına gönder"
            className="flex items-center gap-1 rounded bg-violet-600/20 px-2 py-1 text-[10px] font-medium text-violet-300 hover:bg-violet-600/35"
          >
            <Grid2X2 className="h-3 w-3" />
            4 Açı Grid
          </button>

          <button
            onClick={() => useStudioStore.getState().exportStageGlbFn?.()}
            className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-3 w-3" />
            .GLB
          </button>
          <button
            onClick={() => useStudioStore.getState().exportStageObjFn?.()}
            className="rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
          >
            .OBJ
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {webglError && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-rose-300">
            3D WebGL alanı başlatılamadı: {webglError}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-2 rounded bg-black/55 px-2 py-1 text-[10px] text-slate-300 backdrop-blur">
          <Eye className="h-3 w-3 text-sky-400" />
          Tıkla: Seç · Gizmo Okları: Taşı/Döndür/Ölçekle · Sürükle: Kamera
        </div>
      </div>
    </div>
  );
}
