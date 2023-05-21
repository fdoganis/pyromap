"use strict";

import { Controller as controller } from '../controller.js';
import { Constants as constants } from '../constants.js';
import { Utils as utils } from '../utils.js';

import {
    ShaderMaterial,
    TextureLoader,
    Color,
    NormalBlending,
    BufferGeometry,
    BufferAttribute,
    Points
} from 'three';

import vertexParticleShader from '../shaders/vertexParticleShader.glsl'
import fragmentParticleShader from '../shaders/fragmentParticleShader.glsl'

const texURL = new URL('../assets/images/circle-particle.png', import.meta.url).href


var FlareParticle = (function () {
    function FlareParticle() {
        var _this = this;
        this.particlesNumber = 500;

        let shaderMaterial;

        new TextureLoader().load(
            texURL,
            (tex) => {
                console.log('Texture ' + texURL + ' Loaded!');
                console.log(tex.image.width);
                console.log(tex.image.height);

                shaderMaterial = new ShaderMaterial({
                    uniforms: {
                        color: { value: new Color(0xffffff) },
                        texture: { value: tex }
                    },
                    vertexShader: vertexParticleShader,
                    fragmentShader: fragmentParticleShader,
                    blending: NormalBlending,
                    depthTest: false,
                    transparent: true
                });
            },
            () => { console.log('Loading texture ' + texURL); },
            () => { console.error('Failed to load: ' + texURL); });

        this.geometry = new BufferGeometry();
        var positions = new Float32Array(this.particlesNumber * 3);
        var colors = new Float32Array(this.particlesNumber * 3);
        var sizes = new Float32Array(this.particlesNumber);
        this.needsUpdate = [];
        this.originalSizes = new Float32Array(this.particlesNumber);
        this.moveDest = new Float32Array(this.particlesNumber * 3);
        this.particleTime = new Float32Array(this.particlesNumber);
        this.particleColor = utils.hexToVec3(controller.getParams().ParticleColor);
        for (var i = 0, i3 = 0; i < this.particlesNumber; i++, i3 += 3) {
            positions[i3 + 0] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;
            this.moveDest[i3] = Math.random() * 200 - 100;
            this.moveDest[i3 + 1] = Math.random() * 0.3 + 0.45;
            this.moveDest[i3 + 2] = Math.random() * 200 - 100;
            colors[i3 + 0] = this.particleColor[0];
            colors[i3 + 1] = this.particleColor[1];
            colors[i3 + 2] = this.particleColor[2];
            sizes[i] = Math.random() * 1 + 0.5;
            this.originalSizes[i] = sizes[i];
        }
        this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
        this.geometry.setAttribute('customColor', new BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new BufferAttribute(sizes, 1));
        this.particleSystem = new Points(this.geometry, shaderMaterial);
        //renderer.addToScene(this.particleSystem); // TODO: add to scene manually after creation
        this.reset();
        FlareParticle.setController();
        controller.attachEvent(controller.PARTICLE_COLOR, function (value) {
            _this.particleColor = utils.hexToVec3(value);
        });
    }

    FlareParticle.prototype.getObject3D = function () {
        return this.particleSystem;
    };


    FlareParticle.setController = function () {
        var _this = this;
        this.particleSpreadingRatio = controller.getParams().ParticleSpread;
        controller.attachEvent(controller.PARTICLE_SPREAD, function (value) {
            _this.particleSpreadingRatio = value;
        });
    };

    FlareParticle.prototype.reset = function () {
        this.time = 0;
        this.spawnParticleTime = 0;
        this.spawnParticleInterval = 1;
        var sizes = this.geometry.attributes['size'].array;
        var positions = this.geometry.attributes['position'].array;
        for (var i = 0; i < this.particlesNumber; i++) {
            sizes[i] = 0;
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            this.needsUpdate[i] = false;
            this.particleTime[i] = 0;
        }
        this.geometry.attributes['size'].needsUpdate = true;
        this.geometry.attributes['position'].needsUpdate = true;
    };

    FlareParticle.prototype.spawnParticle = function () {
        for (var i = 0; i < this.particlesNumber; i++) {
            if (this.needsUpdate[i] == false) {
                this.needsUpdate[i] = true;
                return;
            }
        }
    };

    FlareParticle.prototype.update = function (deltaTime) {
        this.spawnParticleTime += deltaTime;
        if (this.spawnParticleTime > this.spawnParticleInterval) {
            this.spawnParticleTime = 0;
            this.spawnParticleInterval = Math.random() * 300 + 50;
            this.spawnParticle();
        }
        deltaTime /= 1000;
        this.time += deltaTime;
        this.particleSystem.rotation.y += 0.01 * deltaTime;
        var timeScale = controller.getParams().TimeScale / 3;
        var sizes = this.geometry.attributes['size'].array;
        var positions = this.geometry.attributes['position'].array;
        var colors = this.geometry.attributes['customColor'].array;
        for (var i = 0, i3 = 0; i < this.particlesNumber; i++, i3 += 3) {
            if (this.needsUpdate[i]) {
                if (this.particleTime[i] > constants.MAXIMUM_LIVE_TIME / 1000) {
                    positions[i3] = 0;
                    positions[i3 + 1] = 0;
                    positions[i3 + 2] = 0;
                    this.particleTime[i] = 0;
                    sizes[i] = 0.01;
                }
                else {
                    var ac = FlareParticle.particleSpreadingRatio *
                        this.particleTime[i] / (constants.MAXIMUM_LIVE_TIME / 1000) +
                        0.01 * Math.sin(this.time);
                    var randDist = (10 * Math.sin(0.3 * i + this.time + Math.random() / 10)) * timeScale;
                    sizes[i] = this.originalSizes[i] * (3 + Math.sin(0.4 * i + this.time));
                    positions[i3] = ac * this.moveDest[i3] + randDist;
                    positions[i3 + 1] += (Math.random() * 0.4 + 0.9) * this.moveDest[i3 + 1] * timeScale;
                    positions[i3 + 2] = ac * this.moveDest[i3 + 2] + randDist;
                    this.particleTime[i] += deltaTime;
                }
            }
            colors[i3] = this.particleColor[0];
            colors[i3 + 1] = this.particleColor[1];
            colors[i3 + 2] = this.particleColor[2];
        }
        this.geometry.attributes['customColor'].needsUpdate = true;
        this.geometry.attributes['size'].needsUpdate = true;
        this.geometry.attributes['position'].needsUpdate = true;
    };
    return FlareParticle;
}());

export { FlareParticle };
