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

/**
  * Returns the query parameters as a key/value object. 
  * Example: If the query parameters are
  *
  *    abc=123&def=456&name=gman
  *
  * Then `getQuery()` will return an object like
  *
  *    {
  *      abc: '123',
  *      def: '456',
  *      name: 'gman',
  *    }
  * 
  * source: https://threejs.org/manual/#en/debugging-javascript 
  */
function getQuery() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

const query = getQuery();
const debug = query.debug === 'true';
const showHelpers = query.showHelpers === 'true';
//const showHelpers = 'true'; // TODO: FIXME


let mixer = null;
let fire_gltf = null;

let container;
let camera;
/** @type {THREE.Scene} */
let scene;
let renderer;
let controller;

let reticle;
let cone = null;
let extinguisherMesh = new THREE.Object3D();

let hitTestSource = null;
let hitTestSourceRequested = false;

let currentReticlePosition = new THREE.Vector3();

let tmpPos = new THREE.Vector3();
let tmpRot = new THREE.Quaternion();
let tmpScale = new THREE.Vector3();

const Role = Object.freeze({
  Pyromaniac: 'pyromaniac',
  Fireman: 'fireman'
})

let role = Role.Pyromaniac;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

const FIRE_MODEL_SCALE = 0.5;
const FIRE_MODEL_OFFSET = 2.83;
const FIRE_MAX_LIFESPAN = 100.0;

const EXTINGUISHER_RANGE = 2.0;

const models = {
  fire: { name: 'fire', url: 'fire_animation.glb', posX: 0.0, posY: FIRE_MODEL_OFFSET, posZ: 0.0, scale: FIRE_MODEL_SCALE },
  extinguisher: { name: 'extinguisher', url: 'extin.glb', posX: 0.0, posY: -0.33, posZ: 0.0, scale: 0.0015 },
};



const clock = new THREE.Clock();

const mixers = [];

let initOK = false;

init();

function init() {

  container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();

  //debug
  if (showHelpers) {
    const gridHelper = new THREE.GridHelper();
    scene.add(gridHelper);
  }


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

  let numFires = 0;
  const MAX_FIRES = 5;

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect); // change?



  scene.add(controller);

  // create cone
  const geometry = new THREE.ConeGeometry(1.0, 1.0, 24).rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  //const material = new THREE.MeshNormalMaterial(); // debug
  cone = new THREE.Mesh(geometry, material);
  cone.visible = false;
  scene.add(cone);

  // load models
  loadData();

  let tmpMatrix = new THREE.Matrix4();

  function onSelect() {

    if (!initOK) { return; };

    if (reticle.visible) {
      if (numFires < MAX_FIRES) {

        // Pyromaniac can light up to MAX_FIRES fires

        // see https://threejs.org/manual/#en/game

        tmpMatrix = reticle.matrix;

        const clone = cloneModel(models.fire, tmpMatrix);
        clone.userData.lifespan = FIRE_MAX_LIFESPAN;

        numFires++;

      } else {

        role = Role.Fireman;

        const root = new THREE.Object3D();
        const model = models.extinguisher;
        extinguisherMesh.name = model.name;
        root.add(model.gltf.scene);

        root.translateX(model.posX * model.scale);
        root.translateY(model.posY * model.scale);
        root.translateZ(model.posZ * model.scale);
        root.rotateY(-Math.PI / 2);
        root.scale.set(model.scale, model.scale, model.scale);

        extinguisherMesh.add(root);
        scene.add(extinguisherMesh);

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

const oldPos = new THREE.Vector3();
function handleController(controller) {

  if (role != Role.Fireman) { return; }
  if (cone === null) { return; }

  const userData = controller.userData;
  if (userData.isSelecting === true) {
    cone.visible = !cone.visible; // TODO: improve animation instead of simply blinking: add particles?

    /** @type {THREE.Object3D} */
    const fire = findClosestFire(currentReticlePosition, EXTINGUISHER_RANGE);
    if (fire) {
      fire.userData.lifespan -= 1.0;
      const life = fire.userData.lifespan;
      const fireScale = FIRE_MODEL_SCALE * life / FIRE_MAX_LIFESPAN;
      //oldPos.copy(fire.position.clone());

      fire.position.set(fire.position.x, -FIRE_MODEL_OFFSET * FIRE_MODEL_SCALE, fire.position.z);
      fire.children[0].scale.set(fireScale, fireScale, fireScale); // WARNING: scale changes position
      //fire.children[0].position.set(fire.position.x, FIRE_MODEL_OFFSET * fireScale, fire.position.z);
      fire.translateY(FIRE_MODEL_OFFSET * fireScale);


      if (life === 0) {
        scene.remove(fire);
      }

    }

  } else {
    cone.visible = false;
  }

  extinguisherMesh.position.set(0, 0, -0.3).applyMatrix4(controller.matrixWorld);
  extinguisherMesh.quaternion.setFromRotationMatrix(controller.matrixWorld);

}


const MAX_DISTANCE = 1e6;

function findClosestFire(pos, range) {

  let minDist = MAX_DISTANCE;
  let closestFire = null;
  const fires = scene.getObjectsByProperty("name", "fire");

  fires.forEach(fire => {

    let distance = fire.position.distanceTo(pos);
    if ((distance < range) && (distance < minDist)) {
      minDist = distance;
      closestFire = fire;
    }
  })

  return closestFire;
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

  for (const model of Object.values(models)) {
    gltfLoader.load(model.url, (gltf) => {
      model.gltf = gltf;
    });
  }


}

function allModelsLoaded() {

  prepModelsAndAnimations();

  initOK = true;
}

function prepModelsAndAnimations() {
  Object.values(models).forEach(model => {
    const animsByName = {};
    model.gltf.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    model.animations = animsByName;
  });
}

/**
 * Clone model, add it to scenegraph and return it for further processing
 * @param {*} model Model to clone, must be an object containing a GLTF model stored in model.gltf
 * @param {*} matrix Matrix used to scale and place the model
 * @returns {THREE.Object3D} the cloned object
 */
function cloneModel(model, matrix) {
  const clonedScene = SkeletonUtils.clone(model.gltf.scene);

  const root = new THREE.Object3D();
  root.name = model.name;
  root.add(clonedScene);

  // debug
  if (showHelpers) {
    const box = new THREE.BoxHelper(root, 0xffffff);
    root.add(box);

    const axesHelper = new THREE.AxesHelper(0.5);
    root.add(axesHelper);
  }
  scene.add(root);

  //root.userData.bbox = box;

  // TODO: CHECK https://stackoverflow.com/questions/42812861/three-js-pivot-point/42866733#42866733

  // https://stackoverflow.com/questions/27022160/three-js-can-i-apply-position-rotation-and-scale-to-the-geometry

  // Reframe / FitAllIn: https://stackoverflow.com/questions/11766163/smart-centering-and-scaling-after-model-import-in-three-js

  // https://stackoverflow.com/questions/33454919/scaling-a-three-js-geometry-only-up


  if (matrix) {
    matrix.decompose(root.position, root.quaternion, tmpScale);
    clonedScene.scale.set(model.scale, model.scale, model.scale);
    root.translateX(model.posX * clonedScene.scale.x);
    root.translateY(model.posY * clonedScene.scale.y);
    root.translateZ(model.posZ * clonedScene.scale.z);

  }


  // https://stackoverflow.com/questions/27022160/three-js-can-i-apply-position-rotation-and-scale-to-the-geometry
  /*
    object.updateMatrix();
  
    object.geometry.applyMatrix4(object.matrix);
  
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.updateMatrix();
    */

  // make sure prepModelsAndAnimations() has been called before calling this code
  const mixer = new THREE.AnimationMixer(clonedScene);
  const firstClip = Object.values(model.animations)[0];
  const action = mixer.clipAction(firstClip);
  action.play();
  mixers.push(mixer);

  return root;
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

      if (role === Role.Fireman) {

        reticle.visible = false;

        reticle.matrix.decompose(currentReticlePosition, tmpRot, tmpScale);
        cone.position.copy(currentReticlePosition);
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