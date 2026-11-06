const hero = document.querySelector('.hero');
const world = document.querySelector('#world');
const shell = document.querySelector('.datacenter-shell');
const progress = document.querySelector('.progress span');
const readout = document.querySelector('#distanceReadout');
const panel = document.querySelector('#rackPanel');
const panelTitle = document.querySelector('#panelTitle');
const panelText = document.querySelector('#panelText');
const panelKicker = document.querySelector('#panelKicker');
const panelClose = document.querySelector('#panelClose');
const assetStatus = document.querySelector('#assetStatus');
const canvas = document.querySelector('#threeCanvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rackData = {
  data: ['RACK / 01', 'Data & telecommunicatie', 'Glasvezel, datanetwerken en telecommunicatie zorgvuldig aangelegd, getest en gedocumenteerd. REDCO brengt de verbinding van plan naar praktijk.'],
  power: ['RACK / 02', 'Elektra & continuïteit', 'Elektra, noodstroom en betrouwbare infrastructuur afgestemd op de manier waarop een gebouw wordt gebruikt.'],
  security: ['RACK / 03', 'Beveiliging & monitoring', 'Brandbeveiliging, beveiliging en controle als integraal onderdeel van een installatie die moet blijven werken.'],
  build: ['RACK / 04', 'Bouw & renovatie', 'Planning, bouwtechniek en uitvoering voor renovaties en verbouwingen waarin elke discipline samenkomt.'],
  people: ['RACK / 05', 'Vakmensen op locatie', 'Flexibele inzet van mensen die weten wat er op een bouwplaats, in een technische ruimte of op locatie nodig is.']
};

let activeRack = null;
let threeScene = null;
let threeCamera = null;
let threeRenderer = null;
let raycaster = null;
let pointer = null;
const rackMeshes = {};
let cameraGoal = { x: 0, y: 2.35, z: 8.5, tx: 0, ty: 1.35, tz: -4 };
let cameraNow = { ...cameraGoal };

function updateCamera() {
  const heroTop = hero?.offsetTop || 0;
  const heroTravel = Math.max((hero?.offsetHeight || window.innerHeight) - window.innerHeight, 1);
  const ratio = Math.max(0, Math.min((window.scrollY - heroTop) / heroTravel, 1));
  const z = reducedMotion ? 0 : Math.round(ratio * 100);
  world?.style.setProperty('--camera-z', `${z}px`);
  if (progress) progress.style.width = `${Math.min(window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1) * 100, 100)}%`;
  if (threeCamera && !activeRack) {
    cameraGoal.z = 8.5 - ratio * 2.6;
    cameraGoal.tz = -4 - ratio * 16;
  }
  if (!activeRack && readout) readout.textContent = `CAM 01 — ${String(Math.round(100 - ratio * 100)).padStart(2, '0')}% OVERVIEW`;
}
window.addEventListener('scroll', updateCamera, { passive: true });

window.addEventListener('pointermove', (event) => {
  if (reducedMotion || activeRack || !shell) return;
  const rect = shell.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  cameraGoal.x = x * 1.1;
  cameraGoal.y = 2.35 + y * -0.3;
  world?.style.setProperty('--pointer-x', `${x * 12}px`);
  world?.style.setProperty('--pointer-y', `${y * -8}px`);
});

function setStatus(message, busy = false) {
  if (!assetStatus) return;
  assetStatus.textContent = message;
  assetStatus.classList.toggle('is-busy', busy);
}

function textFloor(THREE) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1200;
  textureCanvas.height = 180;
  const context = textureCanvas.getContext('2d');
  context.font = '700 110px Arial';
  context.textAlign = 'center';
  context.fillStyle = 'rgba(255, 82, 42, .72)';
  context.shadowColor = 'rgba(255, 58, 30, .75)';
  context.shadowBlur = 26;
  context.fillText('REDCO BV', 600, 122);
  const texture = new THREE.CanvasTexture(textureCanvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.08), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, .045, -10);
  return mesh;
}

function prepareModel(THREE, model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material?.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
    if (child.material) child.material.envMapIntensity = 1.2;
  });
  return model;
}

function makeGlassDoor(THREE, model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const min = bounds.min;
  const max = bounds.max;
  const pivot = new THREE.Group();
  pivot.position.set(min.x, min.y, max.z + .025);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(size.x * .96, .55), Math.max(size.y * .93, 1.65)), new THREE.MeshPhysicalMaterial({ color: 0x76d9df, transmission: .25, transparent: true, opacity: .18, roughness: .16, metalness: .15, emissive: 0x12383e, emissiveIntensity: .35 }));
  glass.position.set(size.x / 2, size.y * .47, 0);
  pivot.add(glass);
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x5d7a7d, metalness: .82, roughness: .22, emissive: 0x0c282b, emissiveIntensity: .4 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.035, size.y * .95, .045), railMaterial);
  rail.position.set(.025, size.y * .47, .035);
  pivot.add(rail);
  return pivot;
}

function cloneRack(THREE, source, key, x, z, scale = 1.2) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.scale.setScalar(scale);
  root.userData.key = key;
  root.userData.open = 0;
  const model = prepareModel(THREE, source.clone(true));
  root.add(model);
  const doorPivot = makeGlassDoor(THREE, model);
  root.add(doorPivot);
  root.userData.doorPivot = doorPivot;
  return root;
}

function getRackFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.key && rackMeshes[current.userData.key] === current) return current.userData.key;
    current = current.parent;
  }
  return null;
}

async function initWebGL() {
  try {
    setStatus('REAL-TIME 3D ASSETS / laden…', true);
    const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
    const { GLTFLoader } = await import('https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
    threeScene = new THREE.Scene();
    threeScene.fog = new THREE.FogExp2(0x050809, .028);
    threeCamera = new THREE.PerspectiveCamera(48, 1, .05, 120);
    threeCamera.position.set(cameraNow.x, cameraNow.y, cameraNow.z);
    threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeRenderer.toneMappingExposure = 1.18;
    threeRenderer.shadowMap.enabled = true;
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeScene.add(new THREE.HemisphereLight(0x77dce3, 0x010202, 1.15));
    const key = new THREE.DirectionalLight(0xff8566, 2.2);
    key.position.set(-5, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    threeScene.add(key);
    const cyan = new THREE.PointLight(0x1ed8ec, 5.2, 22);
    cyan.position.set(0, 3.4, -2);
    threeScene.add(cyan);
    const red = new THREE.PointLight(0xff3e20, 3.8, 18);
    red.position.set(-4, 2.6, -14);
    threeScene.add(red);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 52), new THREE.MeshStandardMaterial({ color: 0x090d0e, metalness: .78, roughness: .34 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    threeScene.add(floor);
    const grid = new THREE.GridHelper(34, 42, 0x235b60, 0x0d2729);
    grid.position.set(0, .02, -10);
    threeScene.add(grid);
    threeScene.add(textFloor(THREE));
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(34, 52), new THREE.MeshBasicMaterial({ color: 0x0d1516, side: THREE.DoubleSide, transparent: true, opacity: .55 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7.2, -10);
    threeScene.add(ceiling);
    const loader = new GLTFLoader();
    const load = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const starter = await load('https://cdn.3dassets.dev/assets/29277/v1/model.glb');
    const realWorld = prepareModel(THREE, starter.scene);
    const worldBox = new THREE.Box3().setFromObject(realWorld);
    const worldSize = worldBox.getSize(new THREE.Vector3());
    if (worldSize.y > 7) realWorld.scale.setScalar(6.2 / worldSize.y);
    const centeredBox = new THREE.Box3().setFromObject(realWorld);
    const centered = centeredBox.getCenter(new THREE.Vector3());
    realWorld.position.x -= centered.x;
    realWorld.position.z -= centered.z + 9;
    realWorld.position.y -= centeredBox.min.y;
    threeScene.add(realWorld);
    const rackAsset = await load('https://cdn.3dassets.dev/assets/29226/v1/model.glb');
    const rackPositions = { data: [-2.2, -2.2], power: [2.2, -5.6], security: [-2.2, -9], build: [2.2, -12.4], people: [-2.2, -15.8] };
    Object.entries(rackPositions).forEach(([rackKey, [x, z]]) => {
      const rack = cloneRack(THREE, rackAsset.scene, rackKey, x, z, 1.22);
      rackMeshes[rackKey] = rack;
      threeScene.add(rack);
    });
    document.body.classList.add('webgl-ready');
    setStatus('REAL-TIME 3D ASSETS / ONLINE');
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, threeCamera);
      const hit = raycaster.intersectObjects(Object.values(rackMeshes), true)[0];
      const keyHit = hit ? getRackFromObject(hit.object) : null;
      if (keyHit) focusRack(keyHit);
    });
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      threeRenderer.setSize(width, height, false);
      threeCamera.aspect = width / height;
      threeCamera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    function render() {
      requestAnimationFrame(render);
      const ease = reducedMotion ? 1 : .075;
      ['x', 'y', 'z', 'tx', 'ty', 'tz'].forEach((axis) => { cameraNow[axis] += (cameraGoal[axis] - cameraNow[axis]) * ease; });
      threeCamera.position.set(cameraNow.x, cameraNow.y, cameraNow.z);
      threeCamera.lookAt(cameraNow.tx, cameraNow.ty, cameraNow.tz);
      Object.values(rackMeshes).forEach((rack) => {
        const target = rack.userData.open ? -1.28 : 0;
        rack.userData.doorPivot.rotation.y += (target - rack.userData.doorPivot.rotation.y) * (reducedMotion ? 1 : .1);
      });
      threeRenderer.render(threeScene, threeCamera);
    }
    render();
  } catch (error) {
    setStatus('CSS-3D FALLBACK / asset niet bereikbaar');
    console.info('WebGL asset fallback actief', error);
  }
}

function focusRack(key) {
  const [kicker, title, text] = rackData[key];
  document.querySelectorAll('.rack.is-selected').forEach((rack) => rack.classList.remove('is-selected'));
  document.querySelector(`.rack[data-rack="${key}"]`)?.classList.add('is-selected');
  activeRack = key;
  panelKicker.textContent = kicker;
  panelTitle.textContent = title;
  panelText.textContent = text;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  readout.textContent = `${kicker} — FOCUS`;
  if (threeCamera && rackMeshes[key]) {
    const rack = rackMeshes[key];
    const position = rack.position.clone();
    Object.values(rackMeshes).forEach((item) => { item.userData.open = 0; });
    rack.userData.open = 1;
    cameraGoal = { x: position.x + 1.1, y: 1.7, z: position.z + 3.5, tx: position.x, ty: 1.15, tz: position.z + .25 };
  }
}

function closePanel() {
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.rack.is-selected').forEach((rack) => rack.classList.remove('is-selected'));
  Object.values(rackMeshes).forEach((rack) => { rack.userData.open = 0; });
  activeRack = null;
  readout.textContent = 'CAM 01 — OVERVIEW';
  updateCamera();
}

document.querySelectorAll('.rack-hit').forEach((button) => button.addEventListener('click', () => focusRack(button.closest('.rack').dataset.rack)));
panelClose?.addEventListener('click', closePanel);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePanel(); });
document.querySelector('#contactForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#formNote').textContent = 'Bedankt — je bericht staat klaar voor REDCO. We nemen zo snel mogelijk contact op.';
  event.currentTarget.reset();
});
updateCamera();
initWebGL();
