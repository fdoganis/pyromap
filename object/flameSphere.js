"use strict";

import { Utils as utils } from '../utils.js';

import {
    ShaderMaterial,
    Mesh,
    IcosahedronGeometry
} from 'three';


// Vite default functionality to import glsl shaders does not seem to work.
// Using plugin instead, see vite.config.js and treating these files as source code, not as assets
// Remember to add "type": "module" in package.json
import vertexFlameShader from '../shaders/vertexFlameShader.glsl'
import fragmentFlameShader from '../shaders/fragmentFlameShader.glsl'




var FlameSphere = (function () {


    function FlameSphere(radius) {
        this.flowRatio = 1;
        radius = radius || 20;

        this.material = new ShaderMaterial({
            uniforms: {
                time: {
                    type: "f",
                    value: 0.0
                },
                seed: {
                    type: 'f',
                    value: Math.random() * 1000.0
                },
                detail: {
                    type: 'f',
                    value: Math.random() * 3.5 + 5
                },
                opacity: {
                    type: 'f',
                    value: 1
                },
                colLight: {
                    value: utils.hexToVec3(FlameSphere.defaultColor.colLight)
                },
                colNormal: {
                    value: utils.hexToVec3(FlameSphere.defaultColor.colNormal)
                },
                colDark: {
                    value: utils.hexToVec3(FlameSphere.defaultColor.colDark)
                }
            },
            vertexShader: vertexFlameShader,
            fragmentShader: fragmentFlameShader
        });
        this.material.transparent = true;
        this.mesh = new Mesh(new IcosahedronGeometry(radius, 3), this.material);
        this.mesh.position.set(0, 0, 0);
    }
    FlameSphere.prototype.setColor = function (prop) {
        if (prop.colDark != null) {
            if (typeof prop.colDark === 'string') {
                this.material.uniforms['colDark'].value = utils.hexToVec3(prop.colDark);
            }
            else {
                this.material.uniforms['colDark'].value = prop.colDark;
            }
        }
        if (prop.colNormal != null) {
            if (typeof prop.colNormal === 'string') {
                this.material.uniforms['colNormal'].value = utils.hexToVec3(prop.colNormal);
            }
            else {
                this.material.uniforms['colNormal'].value = prop.colNormal;
            }
        }
        if (prop.colLight != null) {
            if (typeof prop.colLight === 'string') {
                this.material.uniforms['colLight'].value = utils.hexToVec3(prop.colLight);
            }
            else {
                this.material.uniforms['colLight'].value = prop.colLight;
            }
        }
    };
    FlameSphere.prototype.setOpacity = function (value) {
        this.material.uniforms['opacity'].value = value;
    };
    FlameSphere.prototype.setDetail = function (value) {
        this.material.uniforms['detail'].value = value;
    };
    FlameSphere.prototype.update = function (timeDiff) {
        this.material.uniforms['time'].value += .0005 * timeDiff * this.flowRatio;
    };
    FlameSphere.prototype.setFlowRatio = function (val) {
        this.flowRatio = val;
    };
    FlameSphere.prototype.getMesh = function () {
        return this.mesh;
    };
    FlameSphere.defaultColor = {
        colDark: '#000000',
        colNormal: '#f7a90e',
        colLight: '#ede92a'
    };
    return FlameSphere;
}());

export { FlameSphere };
