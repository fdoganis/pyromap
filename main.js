"use strict";

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
  fire: { name: 'fire', url: 'fire_animation.glb', posX: 0.0, posY: 2.83, posZ: 0.0, scale: 0.5 },
};



const clock = new THREE.Clock();

const mixers = [];

let initOK = false;

init();

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

  let num = 0;
  const MAX_FIRES = 5;

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect); // change?


  //controller.userData.skipFrames = 0;

  scene.add(controller);

  // create cone
  const geometry = new THREE.ConeGeometry(1.0, 1.0, 24).rotateX(Math.PI / 2);
  //const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const material = new THREE.MeshNormalMaterial();
  cone = new THREE.Mesh(geometry, material);
  scene.add(cone);

  // load models
  loadData();

  let tmpMatrix = new THREE.Matrix4();

  function onSelect() {

    if (!initOK) { return; };

    if (reticle.visible) {
      if (num < MAX_FIRES) {

        // Pyromaniac can light up to MAX_FIRES fires

        // see https://threejs.org/manual/#en/game

        tmpMatrix = reticle.matrix;

        cloneModel(modelsToLoad.fire, tmpMatrix);

        num++;

      } else {

        role = Role.Fireman;

        controller.removeEventListener('select', onSelect);

        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);


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


function cloneModel(model, matrix) {
  const clonedScene = SkeletonUtils.clone(model.gltf.scene);
  const root = new THREE.Object3D();
  root.name = model.name;
  root.add(clonedScene);
  scene.add(root);

  if (matrix) {
    matrix.decompose(root.position, root.quaternion, root.scale);
    root.translateX(model.posX);
    root.translateY(model.posY);
    root.translateZ(model.posZ);
    root.scale.set(model.scale, model.scale, model.scale);
  }

  // make sure prepModelsAndAnimations() has been called before calling this code
  const mixer = new THREE.AnimationMixer(clonedScene);
  const firstClip = Object.values(model.animations)[0];
  const action = mixer.clipAction(firstClip);
  action.play();
  mixers.push(mixer);
}


let tmpPos = new THREE.Vector3();
let tmpRot = new THREE.Quaternion();
let tmpScale = new THREE.Vector3();

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

      if (role === Role.Fireman) {

        reticle.visible = false;

        reticle.matrix.decompose(tmpPos, tmpRot, tmpScale);
        cone.position.copy(tmpPos);
        tmpPos.setFromMatrixPosition(controller.matrixWorld);
        cone.lookAt(tmpPos);
        let scale = cone.position.distanceTo(tmpPos);
        cone.scale.set(tmpScale.x, tmpScale.y, scale);

      }

    }

  }

  animate();

  renderer.render(scene, camera);

}

renderer.setAnimationLoop(render);