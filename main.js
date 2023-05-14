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

let mixer = null;
let model = null;

let container;
let camera, scene, renderer;
let controller;

let reticle;
let cone = null;

let hitTestSource = null;
let hitTestSourceRequested = false;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

const clock = new THREE.Clock();

init();
loadData();
animate();

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

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect); // change?


  //controller.userData.skipFrames = 0;
  //controller.userData.skipFrames = 0;

  scene.add(controller);

  function onSelect() {

    if (reticle.visible) {
      if (num < 5) { //pyromane

        // const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
        // const mesh = new THREE.Mesh(geometry, material);
        // reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        // mesh.scale.y = Math.random() * 2 + 1;
        // scene.add(mesh);

        reticle.matrix.decompose(model.position, model.quaternion, model.scale);
        model.scale.y = Math.random() * 2 + 1;
        scene.add(model);
        num++;

      } else { //mode pompier
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

  if (mixer) mixer.update(delta);

}


function loadData() {
  new GLTFLoader()
    .setDRACOLoader(dracoLoader)
    .setPath('assets/models/')
    .load('fire_animation.glb', gltfReader);
}


function gltfReader(gltf) {

  model = gltf.scene;
  model.position.set(1, 1, 0);
  model.scale.set(0.01, 0.01, 0.01);

  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(gltf.animations[0]).play();

  animate();
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