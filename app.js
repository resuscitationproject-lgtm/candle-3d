const canvas = document.querySelector("#worldCanvas");
const loading = document.querySelector("#loading");
const placeName = document.querySelector("#placeName");
const positionText = document.querySelector("#positionText");
const zoneTitle = document.querySelector("#zoneTitle");
const zoneText = document.querySelector("#zoneText");
const chatLog = document.querySelector("#chatLog");
const nickname = document.querySelector("#nickname");

let THREE;
let places;
let scene;
let camera;
let renderer;
let world;
let avatar;
const keys = new Set();
const moveButtons = new Set();
let clock;
let nearestPlace = "entrance";

try {
  THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
  init();
} catch (error) {
  loading.textContent = "3Dライブラリを読み込めませんでした。インターネット接続がある状態で開いてください。";
  console.error(error);
}

function init() {
  places = {
    entrance: {
      label: "入口",
      text: "まずは会場を見回してみましょう。聞くだけ参加でも大丈夫です。",
      position: new THREE.Vector3(0, 0, 7.5)
    },
    students: {
      label: "学生テーブル",
      text: "近い世代の話を聞いたり、学校や日常のことを少しだけ話せます。",
      position: new THREE.Vector3(-4.6, 0, .8)
    },
    adults: {
      label: "社会人テーブル",
      text: "仕事、暮らし、進路など、テーマを決めずに大人とゆるく話せます。",
      position: new THREE.Vector3(4.6, 0, .4)
    },
    kitchen: {
      label: "食堂カウンター",
      text: "今日のごはんや会場の空気を見ながら、リアクションできます。",
      position: new THREE.Vector3(0, 0, -5.6)
    }
  };

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17201f);
  scene.fog = new THREE.Fog(0x17201f, 13, 24);

  camera = new THREE.PerspectiveCamera(55, 1, .1, 100);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  world = new THREE.Group();
  scene.add(world);

  avatar = new THREE.Group();
  avatar.position.copy(places.entrance.position);
  scene.add(avatar);
  clock = new THREE.Clock();

  buildRoom();
  buildAvatar();
  bindControls();
  resize();
  updatePlace(true);
  loading.classList.add("hidden");
  requestAnimationFrame(tick);
}

function material(color, roughness = .75) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .04 });
}

function mesh(geometry, mat, position, cast = true, receive = true) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.copy(position);
  item.castShadow = cast;
  item.receiveShadow = receive;
  return item;
}

function buildRoom() {
  scene.add(new THREE.HemisphereLight(0xfff2d2, 0x2b3d3a, 1.6));

  const warmLight = new THREE.PointLight(0xffc96f, 2.8, 18);
  warmLight.position.set(0, 5.4, 2);
  warmLight.castShadow = true;
  scene.add(warmLight);

  const floor = mesh(
    new THREE.BoxGeometry(14, .24, 18),
    material(0xc99a62),
    new THREE.Vector3(0, -.12, 0),
    false
  );
  world.add(floor);

  const wallMat = material(0x7f6040);
  const backWall = mesh(new THREE.BoxGeometry(14, 5, .28), wallMat, new THREE.Vector3(0, 2.4, -9), false);
  const leftWall = mesh(new THREE.BoxGeometry(.28, 5, 18), wallMat, new THREE.Vector3(-7, 2.4, 0), false);
  const rightWall = mesh(new THREE.BoxGeometry(.28, 5, 18), wallMat, new THREE.Vector3(7, 2.4, 0), false);
  world.add(backWall, leftWall, rightWall);

  addSign();
  addTable(-4.4, .2, 0x4c78a8, "学生");
  addTable(4.3, .1, 0x8b6fb4, "社会人");
  addKitchen();
  addLanterns();
  addGuideRing(places.entrance.position, 0x4f8b6b);
}

function addSign() {
  const board = mesh(
    new THREE.BoxGeometry(5.5, 1.6, .24),
    material(0x263130),
    new THREE.Vector3(0, 3.2, -8.82)
  );
  world.add(board);

  const canvasLabel = document.createElement("canvas");
  canvasLabel.width = 1024;
  canvasLabel.height = 320;
  const ctx = canvasLabel.getContext("2d");
  ctx.fillStyle = "#fffaf1";
  ctx.font = "700 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NPO法人BeWith", 512, 98);
  ctx.font = "900 118px sans-serif";
  ctx.fillText("縁日食堂", 512, 230);
  const texture = new THREE.CanvasTexture(canvasLabel);
  const label = mesh(
    new THREE.PlaneGeometry(5.1, 1.28),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    new THREE.Vector3(0, 3.22, -8.68),
    false,
    false
  );
  world.add(label);
}

function addTable(x, z, color, label) {
  const table = mesh(
    new THREE.CylinderGeometry(1.65, 1.8, .36, 48),
    material(0xb87948),
    new THREE.Vector3(x, .55, z)
  );
  world.add(table);

  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    const chair = mesh(
      new THREE.CylinderGeometry(.34, .4, .34, 24),
      material(color),
      new THREE.Vector3(x + Math.cos(angle) * 2.3, .28, z + Math.sin(angle) * 2)
    );
    world.add(chair);
  }

  const plateMat = material(0xfff8e9);
  [-.7, 0, .7].forEach((offset) => {
    world.add(mesh(new THREE.CylinderGeometry(.26, .3, .05, 24), plateMat, new THREE.Vector3(x + offset, .78, z + .2)));
  });

  addTextLabel(label, new THREE.Vector3(x, 1.25, z), color);
  addGuideRing(new THREE.Vector3(x, 0, z + 2.5), color);
}

function addKitchen() {
  const counter = mesh(
    new THREE.BoxGeometry(5.8, 1.1, 1.1),
    material(0xd85b4a),
    new THREE.Vector3(0, .55, -6.7)
  );
  world.add(counter);
  addTextLabel("食堂カウンター", new THREE.Vector3(0, 1.45, -6.7), 0xd85b4a);
  addGuideRing(places.kitchen.position, 0xd85b4a);

  for (let i = -2; i <= 2; i += 1) {
    world.add(mesh(new THREE.SphereGeometry(.22, 24, 16), material(0xffe1a1), new THREE.Vector3(i * .75, 1.28, -6.25)));
  }
}

function addLanterns() {
  for (let i = -5; i <= 5; i += 1) {
    const lantern = mesh(
      new THREE.SphereGeometry(.26, 24, 16),
      material(i % 2 === 0 ? 0xf4c95d : 0xd85b4a),
      new THREE.Vector3(i * 1.1, 4.35, -8.15)
    );
    lantern.scale.y = 1.35;
    world.add(lantern);

    const light = new THREE.PointLight(0xffc96f, .55, 3);
    light.position.copy(lantern.position);
    scene.add(light);
  }
}

function addGuideRing(position, color) {
  const ring = mesh(
    new THREE.TorusGeometry(.76, .035, 12, 48),
    new THREE.MeshBasicMaterial({ color }),
    new THREE.Vector3(position.x, .08, position.z),
    false,
    false
  );
  ring.rotation.x = Math.PI / 2;
  world.add(ring);
}

function addTextLabel(text, position, color) {
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
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  label.position.copy(position);
  label.scale.set(2.6, .8, 1);
  world.add(label);
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

function buildAvatar() {
  const body = mesh(new THREE.CapsuleGeometry(.36, .75, 8, 24), material(0x1f8f8a), new THREE.Vector3(0, .74, 0));
  const head = mesh(new THREE.SphereGeometry(.32, 32, 20), material(0xffd7aa), new THREE.Vector3(0, 1.52, 0));
  const marker = mesh(new THREE.TorusGeometry(.58, .035, 12, 48), new THREE.MeshBasicMaterial({ color: 0xf4c95d }), new THREE.Vector3(0, .08, 0), false, false);
  marker.rotation.x = Math.PI / 2;
  avatar.add(body, head, marker);
}

function bindControls() {
  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resize);

  document.querySelectorAll("[data-move]").forEach((button) => {
    const direction = button.dataset.move;
    button.addEventListener("pointerdown", () => moveButtons.add(direction));
    button.addEventListener("pointerup", () => moveButtons.delete(direction));
    button.addEventListener("pointerleave", () => moveButtons.delete(direction));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      avatar.position.copy(places[button.dataset.jump].position);
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

function tick() {
  const delta = Math.min(clock.getDelta(), .05);
  moveAvatar(delta);
  updateCamera();
  updatePlace(false);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function moveAvatar(delta) {
  const direction = new THREE.Vector3();
  if (keys.has("w") || keys.has("arrowup") || moveButtons.has("forward")) direction.z -= 1;
  if (keys.has("s") || keys.has("arrowdown") || moveButtons.has("back")) direction.z += 1;
  if (keys.has("a") || keys.has("arrowleft") || moveButtons.has("left")) direction.x -= 1;
  if (keys.has("d") || keys.has("arrowright") || moveButtons.has("right")) direction.x += 1;

  if (direction.lengthSq() === 0) return;
  direction.normalize();
  avatar.position.addScaledVector(direction, delta * 4.2);
  avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -6, 6);
  avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -7.5, 8);
  avatar.rotation.y = Math.atan2(direction.x, direction.z);
}

function updateCamera() {
  const target = new THREE.Vector3(avatar.position.x, 1.05, avatar.position.z);
  const cameraTarget = new THREE.Vector3(avatar.position.x, 6.2, avatar.position.z + 7.4);
  camera.position.lerp(cameraTarget, .08);
  camera.lookAt(target);
}

function updatePlace(force) {
  let next = nearestPlace;
  let distance = Infinity;
  Object.entries(places).forEach(([key, place]) => {
    const current = avatar.position.distanceTo(place.position);
    if (current < distance) {
      distance = current;
      next = key;
    }
  });

  positionText.textContent = `X ${avatar.position.x.toFixed(1)} / Z ${avatar.position.z.toFixed(1)}`;
  if (!force && (next === nearestPlace || distance > 3.1)) return;

  nearestPlace = next;
  const place = places[next];
  placeName.textContent = place.label;
  zoneTitle.textContent = place.label;
  zoneText.textContent = place.text;
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
