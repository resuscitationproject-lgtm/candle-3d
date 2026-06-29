const canvas = document.querySelector("#worldCanvas");
const loading = document.querySelector("#loading");
const playOverlay = document.querySelector("#playOverlay");
const placeName = document.querySelector("#placeName");
const positionText = document.querySelector("#positionText");
const zoneTitle = document.querySelector("#zoneTitle");
const zoneText = document.querySelector("#zoneText");
const chatLog = document.querySelector("#chatLog");
const nickname = document.querySelector("#nickname");

let THREE;
let scene;
let camera;
let renderer;
let world;
let avatar;
let avatarBody;
let clock;
let floorTexture;
let nearestPlace = "entrance";
let yaw = Math.PI;
let pitch = -.18;
let dragging = false;
let lastPointer = { x: 0, y: 0 };

const keys = new Set();
const moveButtons = new Set();
const npcs = [];

const places = {
  entrance: {
    label: "入口",
    text: "クリックで会場に入り、マウスで見回せます。聞くだけ参加でも大丈夫です。",
    position: vector(0, 0, 8.6)
  },
  students: {
    label: "学生テーブル",
    text: "近い世代の話を聞いたり、学校や日常のことを少しだけ話せます。",
    position: vector(-5.3, 0, .7)
  },
  adults: {
    label: "社会人テーブル",
    text: "仕事、暮らし、進路など、テーマを決めずに大人とゆるく話せます。",
    position: vector(5.3, 0, .2)
  },
  kitchen: {
    label: "食堂カウンター",
    text: "今日のごはんや会場の空気を見ながら、リアクションできます。",
    position: vector(0, 0, -7.2)
  }
};

try {
  THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
  init();
} catch (error) {
  loading.textContent = "3Dライブラリを読み込めませんでした。インターネット接続がある状態で開いてください。";
  console.error(error);
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x182321);
  scene.fog = new THREE.Fog(0x182321, 16, 34);

  camera = new THREE.PerspectiveCamera(62, 1, .1, 120);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  world = new THREE.Group();
  scene.add(world);

  avatar = new THREE.Group();
  avatar.position.copy(toVector3(places.entrance.position));
  scene.add(avatar);

  clock = new THREE.Clock();
  buildRoom();
  buildAvatar();
  bindControls();
  resize();
  updateCamera(true);
  updatePlace(true);
  loading.classList.add("hidden");
  requestAnimationFrame(tick);
}

function vector(x, y, z) {
  return { x, y, z };
}

function toVector3(position) {
  return new THREE.Vector3(position.x, position.y, position.z);
}

function material(color, roughness = .72, metalness = .04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(geometry, mat, position, cast = true, receive = true) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.copy(position);
  item.castShadow = cast;
  item.receiveShadow = receive;
  return item;
}

function buildRoom() {
  scene.add(new THREE.HemisphereLight(0xfff1d0, 0x243b36, 1.35));

  const mainLight = new THREE.DirectionalLight(0xfff1cf, 1.2);
  mainLight.position.set(-3, 8, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  mainLight.shadow.camera.left = -11;
  mainLight.shadow.camera.right = 11;
  mainLight.shadow.camera.top = 12;
  mainLight.shadow.camera.bottom = -12;
  scene.add(mainLight);

  const warmLight = new THREE.PointLight(0xffb75d, 3.2, 20);
  warmLight.position.set(0, 4.7, -2);
  warmLight.castShadow = true;
  scene.add(warmLight);

  floorTexture = makeFloorTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: .86 });
  const floor = mesh(new THREE.BoxGeometry(17, .26, 22), floorMat, new THREE.Vector3(0, -.13, 0), false);
  world.add(floor);

  addWalls();
  addSign();
  addTable(-5.3, .1, 0x4c78a8, "学生", ["進路", "学校", "日常"]);
  addTable(5.3, -.2, 0x8b6fb4, "社会人", ["仕事", "暮らし", "相談"]);
  addKitchen();
  addLanterns();
  addEntrance();
  addFloorDetails();
  addPeople();
}

function addWalls() {
  const wallMat = material(0x76583c, .82);
  const backWall = mesh(new THREE.BoxGeometry(17, 5.2, .32), wallMat, new THREE.Vector3(0, 2.5, -10.8), false);
  const leftWall = mesh(new THREE.BoxGeometry(.32, 5.2, 22), wallMat, new THREE.Vector3(-8.5, 2.5, 0), false);
  const rightWall = mesh(new THREE.BoxGeometry(.32, 5.2, 22), wallMat, new THREE.Vector3(8.5, 2.5, 0), false);
  world.add(backWall, leftWall, rightWall);

  const beamMat = material(0x3f3024, .7);
  for (let x = -7.5; x <= 7.5; x += 3) {
    world.add(mesh(new THREE.BoxGeometry(.18, 5.1, .4), beamMat, new THREE.Vector3(x, 2.55, -10.55), false));
  }
  for (let z = -9; z <= 9; z += 3) {
    world.add(mesh(new THREE.BoxGeometry(.36, 5.1, .18), beamMat, new THREE.Vector3(-8.25, 2.55, z), false));
    world.add(mesh(new THREE.BoxGeometry(.36, 5.1, .18), beamMat, new THREE.Vector3(8.25, 2.55, z), false));
  }
}

function addSign() {
  const board = mesh(
    new THREE.BoxGeometry(6.2, 1.75, .24),
    material(0x25312f, .68),
    new THREE.Vector3(0, 3.25, -10.52)
  );
  world.add(board);

  const label = makeTextPlane("NPO法人BeWith\n縁日食堂", 1024, 380, "#fffaf1", "rgba(0,0,0,0)");
  label.position.set(0, 3.27, -10.35);
  label.scale.set(5.7, 2.1, 1);
  world.add(label);
}

function addTable(x, z, color, label, topics) {
  const table = mesh(
    new THREE.CylinderGeometry(1.75, 1.95, .42, 64),
    material(0xa46a3e, .65),
    new THREE.Vector3(x, .56, z)
  );
  world.add(table);

  const rim = mesh(
    new THREE.TorusGeometry(1.75, .055, 12, 72),
    material(0xf0c27d, .5),
    new THREE.Vector3(x, .8, z),
    true,
    false
  );
  rim.rotation.x = Math.PI / 2;
  world.add(rim);

  const chairMat = material(color, .72);
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI * 2 / 6;
    const chair = mesh(
      new THREE.CylinderGeometry(.42, .5, .38, 28),
      chairMat,
      new THREE.Vector3(x + Math.cos(angle) * 2.45, .28, z + Math.sin(angle) * 2.18)
    );
    chair.scale.y = 1.1;
    world.add(chair);
  }

  const plateMat = material(0xfff8e9, .5);
  topics.forEach((topic, index) => {
    const angle = index * Math.PI * 2 / topics.length + .4;
    world.add(mesh(
      new THREE.CylinderGeometry(.28, .32, .055, 28),
      plateMat,
      new THREE.Vector3(x + Math.cos(angle) * .78, .83, z + Math.sin(angle) * .65)
    ));
    const topicLabel = makeTextSprite(topic, color);
    topicLabel.position.set(x + Math.cos(angle) * .95, 1.16, z + Math.sin(angle) * .84);
    topicLabel.scale.set(1.25, .42, 1);
    world.add(topicLabel);
  });

  const zoneLabel = makeTextSprite(label, color);
  zoneLabel.position.set(x, 1.72, z);
  zoneLabel.scale.set(2.8, .8, 1);
  world.add(zoneLabel);
  addGuideRing(new THREE.Vector3(x, .08, z + 2.85), color);
}

function addKitchen() {
  const counter = mesh(new THREE.BoxGeometry(6.8, 1.2, 1.15), material(0xc84f3f, .62), new THREE.Vector3(0, .62, -8.25));
  world.add(counter);

  const top = mesh(new THREE.BoxGeometry(7.05, .22, 1.35), material(0xf0c27d, .58), new THREE.Vector3(0, 1.28, -8.25));
  world.add(top);

  const norenMat = material(0x375f7d, .78);
  for (let i = -2; i <= 2; i += 1) {
    const cloth = mesh(new THREE.BoxGeometry(1.1, 1.15, .08), norenMat, new THREE.Vector3(i * 1.15, 2.3, -8.87), false, false);
    world.add(cloth);
  }

  ["ごはん", "スープ", "お茶", "お菓子"].forEach((name, index) => {
    const x = -2.2 + index * 1.45;
    world.add(mesh(new THREE.SphereGeometry(.24, 24, 16), material(0xffe1a1, .48), new THREE.Vector3(x, 1.56, -7.82)));
    world.add(mesh(new THREE.CylinderGeometry(.28, .3, .08, 28), material(0xfff8e9, .5), new THREE.Vector3(x, 1.37, -7.82)));
    const label = makeTextSprite(name, 0xd85b4a);
    label.position.set(x, 1.95, -7.65);
    label.scale.set(1.1, .36, 1);
    world.add(label);
  });

  const zoneLabel = makeTextSprite("食堂カウンター", 0xd85b4a);
  zoneLabel.position.set(0, 3.1, -8.6);
  zoneLabel.scale.set(3.7, .8, 1);
  world.add(zoneLabel);
  addGuideRing(toVector3(places.kitchen.position), 0xd85b4a);
}

function addLanterns() {
  for (let i = -7; i <= 7; i += 1) {
    const lantern = mesh(
      new THREE.SphereGeometry(.28, 28, 18),
      material(i % 2 === 0 ? 0xf4c95d : 0xd85b4a, .52),
      new THREE.Vector3(i * 1.05, 4.35, -9.75)
    );
    lantern.scale.y = 1.35;
    world.add(lantern);

    const light = new THREE.PointLight(0xffbd6b, .5, 3.2);
    light.position.copy(lantern.position);
    scene.add(light);
  }

  for (let z = -7; z <= 6; z += 2.6) {
    [-7.55, 7.55].forEach((x) => {
      const lamp = mesh(new THREE.SphereGeometry(.18, 18, 12), material(0xf4c95d, .5), new THREE.Vector3(x, 3.8, z));
      lamp.scale.y = 1.25;
      world.add(lamp);
      const light = new THREE.PointLight(0xffc96f, .35, 2.5);
      light.position.copy(lamp.position);
      scene.add(light);
    });
  }
}

function addEntrance() {
  const mat = material(0x4f8b6b, .68);
  const gate = new THREE.Group();
  gate.add(mesh(new THREE.BoxGeometry(.32, 2.2, .32), mat, new THREE.Vector3(-1.4, 1.1, 9.7)));
  gate.add(mesh(new THREE.BoxGeometry(.32, 2.2, .32), mat, new THREE.Vector3(1.4, 1.1, 9.7)));
  gate.add(mesh(new THREE.BoxGeometry(3.2, .32, .32), mat, new THREE.Vector3(0, 2.15, 9.7)));
  world.add(gate);

  const label = makeTextSprite("入口", 0x4f8b6b);
  label.position.set(0, 2.75, 9.55);
  label.scale.set(1.8, .55, 1);
  world.add(label);
  addGuideRing(toVector3(places.entrance.position), 0x4f8b6b);
}

function addFloorDetails() {
  const mat = material(0xe8c88e, .8);
  for (let z = -7.5; z <= 7.5; z += 2.5) {
    const runner = mesh(new THREE.BoxGeometry(1.15, .035, 1.9), mat, new THREE.Vector3(0, .02, z), false, true);
    world.add(runner);
  }

  const benchMat = material(0x6b4b32, .7);
  [[-7.1, 4.3], [7.1, 4.3], [-7.1, -4.2], [7.1, -4.2]].forEach(([x, z]) => {
    world.add(mesh(new THREE.BoxGeometry(1.7, .28, .5), benchMat, new THREE.Vector3(x, .55, z)));
    world.add(mesh(new THREE.BoxGeometry(.16, .55, .16), benchMat, new THREE.Vector3(x - .65, .28, z - .15)));
    world.add(mesh(new THREE.BoxGeometry(.16, .55, .16), benchMat, new THREE.Vector3(x + .65, .28, z - .15)));
  });
}

function addPeople() {
  addNpc("受付", 0x4f8b6b, new THREE.Vector3(-1.7, 0, 6.4), Math.PI * .85);
  addNpc("学生A", 0x4c78a8, new THREE.Vector3(-6.3, 0, .5), Math.PI * .35);
  addNpc("学生B", 0x568fc2, new THREE.Vector3(-4.1, 0, -1.7), -Math.PI * .2);
  addNpc("社会人A", 0x8b6fb4, new THREE.Vector3(6.2, 0, .4), -Math.PI * .25);
  addNpc("社会人B", 0xa782c1, new THREE.Vector3(4.4, 0, -2), Math.PI * .15);
  addNpc("スタッフ", 0xd85b4a, new THREE.Vector3(2.5, 0, -6.25), Math.PI);
}

function addNpc(name, color, position, rotation) {
  const person = new THREE.Group();
  person.position.copy(position);
  person.rotation.y = rotation;
  const body = mesh(new THREE.CapsuleGeometry(.28, .68, 8, 20), material(color, .64), new THREE.Vector3(0, .72, 0));
  const head = mesh(new THREE.SphereGeometry(.24, 24, 16), material(0xffd7aa, .55), new THREE.Vector3(0, 1.36, 0));
  const hair = mesh(new THREE.SphereGeometry(.255, 20, 12, 0, Math.PI * 2, 0, Math.PI * .58), material(0x2f2925, .72), new THREE.Vector3(0, 1.48, 0));
  person.add(body, head, hair);
  world.add(person);

  const label = makeTextSprite(name, color);
  label.position.set(position.x, 1.9, position.z);
  label.scale.set(1.45, .42, 1);
  world.add(label);
  npcs.push({ group: person, baseY: person.position.y, phase: Math.random() * Math.PI * 2 });
}

function addGuideRing(position, color) {
  const ring = mesh(
    new THREE.TorusGeometry(.86, .035, 12, 64),
    new THREE.MeshBasicMaterial({ color }),
    position,
    false,
    false
  );
  ring.rotation.x = Math.PI / 2;
  world.add(ring);
}

function buildAvatar() {
  avatarBody = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(.34, .82, 8, 24), material(0x1f8f8a, .58), new THREE.Vector3(0, .82, 0));
  const head = mesh(new THREE.SphereGeometry(.29, 28, 18), material(0xffd7aa, .5), new THREE.Vector3(0, 1.55, 0));
  const scarf = mesh(new THREE.TorusGeometry(.31, .045, 10, 28), material(0xf4c95d, .48), new THREE.Vector3(0, 1.18, 0));
  scarf.rotation.x = Math.PI / 2;
  const marker = mesh(new THREE.TorusGeometry(.62, .035, 12, 56), new THREE.MeshBasicMaterial({ color: 0xf4c95d }), new THREE.Vector3(0, .08, 0), false, false);
  marker.rotation.x = Math.PI / 2;
  avatarBody.add(body, head, scarf, marker);
  avatar.add(avatarBody);
}

function bindControls() {
  window.addEventListener("keydown", (event) => {
    keys.add(event.key.toLowerCase());
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) event.preventDefault();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resize);

  canvas.addEventListener("click", () => {
    canvas.requestPointerLock?.();
    playOverlay.classList.add("hidden");
  });
  playOverlay.addEventListener("click", () => {
    canvas.requestPointerLock?.();
    playOverlay.classList.add("hidden");
  });
  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    playOverlay.classList.toggle("hidden", locked);
  });
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas) return;
    rotateView(event.movementX, event.movementY);
  });

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });
  window.addEventListener("pointermove", (event) => {
    if (!dragging || document.pointerLockElement === canvas) return;
    rotateView(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
    lastPointer = { x: event.clientX, y: event.clientY };
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    const direction = button.dataset.move;
    button.addEventListener("pointerdown", () => moveButtons.add(direction));
    button.addEventListener("pointerup", () => moveButtons.delete(direction));
    button.addEventListener("pointerleave", () => moveButtons.delete(direction));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = places[button.dataset.jump].position;
      avatar.position.copy(toVector3(target));
      updatePlace(true);
    });
  });

  document.querySelector("#joinButton").addEventListener("click", () => {
    addChat("受付", `${getName()}さん、ようこそ。3D会場に入室しました。`);
  });

  document.querySelectorAll("[data-message]").forEach((button) => {
    button.addEventListener("click", () => addChat(getName(), button.dataset.message));
  });

  document.querySelector("#staffButton").addEventListener("click", () => {
    addChat("受付", "スタッフに通知しました。少し待っていてください。");
  });
}

function rotateView(deltaX, deltaY) {
  yaw -= deltaX * .0024;
  pitch = THREE.MathUtils.clamp(pitch - deltaY * .0018, -.68, .38);
}

function tick() {
  const elapsed = clock.getElapsedTime();
  const delta = Math.min(clock.getDelta(), .05);
  moveAvatar(delta);
  animatePeople(elapsed);
  updateCamera(false);
  updatePlace(false);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function moveAvatar(delta) {
  const input = new THREE.Vector3();
  if (keys.has("w") || keys.has("arrowup") || moveButtons.has("forward")) input.z += 1;
  if (keys.has("s") || keys.has("arrowdown") || moveButtons.has("back")) input.z -= 1;
  if (keys.has("a") || keys.has("arrowleft") || moveButtons.has("left")) input.x -= 1;
  if (keys.has("d") || keys.has("arrowright") || moveButtons.has("right")) input.x += 1;
  if (input.lengthSq() === 0) return;

  input.normalize();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const direction = new THREE.Vector3()
    .addScaledVector(forward, input.z)
    .addScaledVector(right, input.x)
    .normalize();

  const speed = keys.has("shift") ? 6.2 : 4.2;
  avatar.position.addScaledVector(direction, delta * speed);
  avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -7.45, 7.45);
  avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -9.05, 9.55);
  avatar.rotation.y = Math.atan2(direction.x, direction.z);
}

function animatePeople(elapsed) {
  npcs.forEach((npc) => {
    npc.group.position.y = npc.baseY + Math.sin(elapsed * 1.6 + npc.phase) * .035;
  });
  if (avatarBody) avatarBody.position.y = Math.sin(elapsed * 2.4) * .018;
}

function updateCamera(immediate) {
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const shoulder = new THREE.Vector3(-Math.cos(yaw) * .45, 0, Math.sin(yaw) * .45);
  const target = new THREE.Vector3(avatar.position.x, 1.35, avatar.position.z).addScaledVector(forward, 1.4);
  const cameraTarget = new THREE.Vector3(avatar.position.x, 1.65, avatar.position.z)
    .addScaledVector(forward, -4.4 * Math.cos(pitch))
    .addScaledVector(shoulder, 1)
    .add(new THREE.Vector3(0, 2.2 + pitch * 2.4, 0));

  if (immediate) camera.position.copy(cameraTarget);
  else camera.position.lerp(cameraTarget, .16);
  camera.lookAt(target);
}

function updatePlace(force) {
  let next = nearestPlace;
  let distance = Infinity;
  Object.entries(places).forEach(([key, place]) => {
    const current = avatar.position.distanceTo(toVector3(place.position));
    if (current < distance) {
      distance = current;
      next = key;
    }
  });

  const lockText = document.pointerLockElement === canvas ? "マウス操作中" : "クリックでマウス操作";
  positionText.textContent = `${lockText} / X ${avatar.position.x.toFixed(1)} Z ${avatar.position.z.toFixed(1)}`;
  if (!force && (next === nearestPlace || distance > 3.4)) return;

  nearestPlace = next;
  const place = places[next];
  placeName.textContent = place.label;
  zoneTitle.textContent = place.label;
  zoneText.textContent = place.text;
}

function makeFloorTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#b98555";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 128) {
      ctx.fillStyle = (x / 128 + y / 64) % 2 === 0 ? "#c89964" : "#aa7248";
      ctx.fillRect(x, y, 128, 64);
      ctx.strokeStyle = "rgba(72, 45, 27, .22)";
      ctx.strokeRect(x, y, 128, 64);
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 7);
  return texture;
}

function makeTextPlane(text, width, height, color, background) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = width;
  labelCanvas.height = height;
  const ctx = labelCanvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  const lines = text.split("\n");
  ctx.font = "700 58px sans-serif";
  ctx.fillText(lines[0], width / 2, 110);
  ctx.font = "900 128px sans-serif";
  ctx.fillText(lines[1], width / 2, 265);
  const texture = new THREE.CanvasTexture(labelCanvas);
  return mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    new THREE.Vector3(0, 0, 0),
    false,
    false
  );
}

function makeTextSprite(text, color) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 160;
  const ctx = labelCanvas.getContext("2d");
  ctx.fillStyle = "rgba(255, 250, 241, .94)";
  roundRect(ctx, 28, 28, 456, 96, 18);
  ctx.fill();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "900 46px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 91);
  const texture = new THREE.CanvasTexture(labelCanvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function addChat(author, message) {
  const line = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = author;
  line.append(strong, ` ${message}`);
  chatLog.append(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function getName() {
  return nickname.value.trim() || "オンライン参加者";
}

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
