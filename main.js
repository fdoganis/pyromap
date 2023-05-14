import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';


import {
  GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let mixer = null;
let fire_gltf = null;

let container;
let camera, scene, renderer;
let controller;

let reticle;
let cone = null;

let hitTestSource = null;
let hitTestSourceRequested = false;

const Role = Object.freeze({
  Pyromaniac: 'pyromaniac',
  Fireman: 'fireman'
})

let role = Role.Pyromaniac;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

const modelsToLoad = {
  fire: { name: 'fire', url: 'fire_animation.glb', scale: 0.1 },
};



const clock = new THREE.Clock();

const mixers = [];

let initOK = false;

init();
loadData();

function init() {

  container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  //

  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0);

  let num = 0;
  const MAX_FIRES = 5;

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect); // change?


  //controller.userData.skipFrames = 0;

  scene.add(controller);

  let tmpMatrix = new THREE.Matrix4();

  function onSelect() {

    if (!initOK) { return; };

    if (reticle.visible) {
      if (num < MAX_FIRES) { //pyromane

        // const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
        // const mesh = new THREE.Mesh(geometry, material);
        // reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        // mesh.scale.y = Math.random() * 2 + 1;
        // scene.add(mesh);

        // see https://threejs.org/manual/#en/game

        tmpMatrix = reticle.matrix;

        cloneModel(modelsToLoad.fire, tmpMatrix);

        num++;

      } else { //mode pompier

        role = Role.Fireman;
        controller.removeEventListener('select', onSelect);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);

        const geometry = new THREE.ConeGeometry(0.0456, 0.33536, 24).rotateX(Math.PI / 2);
        //const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const material = new THREE.MeshNormalMaterial();
        cone = new THREE.Mesh(geometry, material);
        scene.add(cone);

        // https://github.com/mrdoob/three.js/blob/master/examples/webxr_ar_paint.html => Exemple code pour Extin 
      }
    }

  }

  function onSelectStart() {


    cone.visible = true;
    this.userData.isSelecting = true;
    //this.userData.skipFrames = 2;
  }

  function onSelectEnd() {

    cone.visible = false;
    this.userData.isSelecting = false;
  }


  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(- Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );

  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  //

  window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}


//

function handleController(controller) {
  if (cone === null) {
    return;
  }

  cone.position.set(0, 0, - 0.2).applyMatrix4(controller.matrixWorld);
  cone.quaternion.setFromRotationMatrix(controller.matrixWorld);

  const userData = controller.userData;
  if (userData.isSelecting === true) {
    cone.visible = !cone.visible;
  } else {
    cone.visible = false;
  }


}


function animate() {

  const delta = clock.getDelta();

  for (const mixer of mixers) {
    mixer.update(delta);
  }

}


function loadData() {

  const manager = new THREE.LoadingManager();
  manager.onLoad = allModelsLoaded;

  const gltfLoader = new GLTFLoader(manager)
    .setDRACOLoader(dracoLoader)
    .setPath('assets/models/');

  for (const model of Object.values(modelsToLoad)) {
    gltfLoader.load(model.url, (gltf) => {
      model.gltf = gltf;
    });
  }


}

function allModelsLoaded() {

  prepModelsAndAnimations();

  //cloneModels();

  initOK = true;
}

function prepModelsAndAnimations() {
  Object.values(modelsToLoad).forEach(model => {
    const animsByName = {};
    model.gltf.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    model.animations = animsByName;
  });
}

function cloneModels() {
  Object.values(modelsToLoad).forEach((model, ndx) => {
    cloneModel(model);
    //root.position.x = (ndx - 3) * 3;
  });
}

function cloneModel(model, matrix) {
  const clonedScene = SkeletonUtils.clone(model.gltf.scene);
  const root = new THREE.Object3D();
  root.name = model.name;
  root.add(clonedScene);
  scene.add(root);

  if (matrix) {
    matrix.decompose(root.position, root.quaternion, root.scale);
    root.scale.set(model.scale, model.scale, model.scale);
  }

  // make sure prepModelsAndAnimations() has been called before calling this code
  const mixer = new THREE.AnimationMixer(clonedScene);
  const firstClip = Object.values(model.animations)[0];
  const action = mixer.clipAction(firstClip);
  action.play();
  mixers.push(mixer);
}


function render(timestamp, frame) {

  handleController(controller);

  if (frame) {

    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {

      session.requestReferenceSpace('viewer').then(function (referenceSpace) {

        session.requestHitTestSource({ space: referenceSpace }).then(function (source) {

          hitTestSource = source;

        });

      });

      session.addEventListener('end', function () {

        hitTestSourceRequested = false;
        hitTestSource = null;

      });

      hitTestSourceRequested = true;

    }

    if (hitTestSource) {

      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {

        const hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);

      } else {

        reticle.visible = false;

      }

    }

  }

  animate();

  renderer.render(scene, camera);

}

renderer.setAnimationLoop(render);