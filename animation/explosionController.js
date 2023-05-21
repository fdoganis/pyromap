"use strict";

import { FlameSphere } from '../object/flameSphere.js'
import { FlameAnimation } from '../animation/flameAnimation.js'
import { FlareParticle } from '../object/flareParticle.js'
import { Controller as controller } from '../controller.js';
//import { Object3D } from 'three';

var ExplosionController = (function () {
    function ExplosionController() {
    }

    ExplosionController.init = function (root) {
        var _this = this;
        this.root = root;
        this.objs = [];
        this.objectPool = [];
        this.spawnTime = 0;
        this.flareParticle = new FlareParticle();
        this.root.add(this.flareParticle.getObject3D());  // now adding FlareParticle manually to the root
        this.spawnNewFlame();

        controller.attachEvent(controller.DARK_COLOR, function (value) {
            for (var i = 0; i < _this.objs.length; i++) {
                _this.currentCol['colDark'] = value;
                _this.objs[i].instance.setColor({ colDark: value });
            }
        });

        controller.attachEvent(controller.NORMAL_COLOR, function (value) {
            for (var i = 0; i < _this.objs.length; i++) {
                _this.currentCol['colNormal'] = value;
                _this.objs[i].instance.setColor({ colNormal: value });
            }
        });

        controller.attachEvent(controller.LIGHT_COLOR, function (value) {
            for (var i = 0; i < _this.objs.length; i++) {
                _this.currentCol['colLight'] = value;
                _this.objs[i].instance.setColor({ colLight: value });
            }
        });

        this.reset();
    };

    ExplosionController.reset = function () {
        for (var i = 0; i < this.objs.length; i++) {
            this.objs[i].reset();
            this.root.remove(this.objs[i].instance.getMesh());
        }
        this.objectPool = [];
        this.objs = [];
        this.flareParticle.reset();
    };

    ExplosionController.spawnNewFlame = function () {
        var i = this.objs.length;
        if (this.objectPool.length > 0) {
            i = this.objectPool.shift();
            this.objs[i].instance.getMesh().visible = true;
            this.objs[i].instance.setColor(this.currentCol);
            this.objs[i].reset();
        }
        else {
            var obj = new FlameAnimation(new FlameSphere(Math.random() * 5 + 8), Math.random() * 7 - 4, Math.random() * 7 - 4, Math.random() * 0.4 + 0.35, Math.random() * 0.4 + 0.3);
            obj.instance.setColor(this.currentCol);
            this.objs.push(obj);
            this.root.add(this.objs[i].instance.getMesh());
        }
    };

    ExplosionController.update = function (deltaTime) {
        var timeScale = controller.getParams().TimeScale;
        this.spawnTime += deltaTime * timeScale;
        if (this.spawnTime > 200) {
            while (this.spawnTime > 200)
                this.spawnTime -= 200;
            this.spawnNewFlame();
        }
        for (var i = 0; i < this.objs.length; i++) {
            if (this.objs[i].isDie()) {
                if (this.objs[i].inPolling())
                    continue;
                this.objs[i].setInPolling(true);
                this.objs[i].instance.getMesh().visible = false;
                this.objectPool.push(i);
            }
            else {
                this.objs[i].update(deltaTime);
            }
        }
        this.flareParticle.update(deltaTime * timeScale);
    };

    ExplosionController.currentCol = {};

    return ExplosionController;
}());

export { ExplosionController };
