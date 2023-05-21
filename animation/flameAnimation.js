"use strict";

import { Controller as controller } from '../controller.js';
import { Utils as utils } from '../utils.js';


var FlameAnimation = (function () {
    function FlameAnimation(instance, distX, distZ, yRatio, animationTimeRatio) {
        distX = distX || 0;
        distZ = distZ || 0;
        yRatio = yRatio || 1;
        animationTimeRatio = animationTimeRatio || 1;
        this.instance = instance;
        this.distX = distX;
        this.distZ = distZ;
        this.yRatio = yRatio;
        this.animationTimeRatio = animationTimeRatio;
        this.reset();
    }
    FlameAnimation.prototype.reset = function () {
        this.randFlyX = Math.random() * 0.1 - 0.05;
        this.randFlyZ = Math.random() * 0.1 - 0.05;
        this.posX = -1;
        this.currentTime = 0;
        this.timeCount = 0;
        this.spawnTime = 0;
        this.isObjDie = false;
        this.isInPooling = false;
        this.currentState = FlameAnimation.STATE_BEFORE_START;
        this.colorTransitionRandom = Math.random() * 2000 - 1000;
        this.instance.getMesh().position.set(0, 0, 0);
        this.instance.getMesh().scale.set(0, 0, 0);
        this.instance.setFlowRatio(1);
        this.instance.setOpacity(1);
    };
    FlameAnimation.prototype.setColor = function () {
        var params = controller.getParams();
        var tc = this.timeCount + this.colorTransitionRandom;
        if (tc < 2500 + this.colorTransitionRandom) {
            var t = tc / 2500 + this.colorTransitionRandom;
            this.instance.setColor({
                colDark: params.NormalColor,
                colNormal: params.LightColor,
                colLight: params.LightColor2
            });
        }
        else if (tc < 4000) {
            var t = (tc - 2500) / 1500;
            this.instance.setColor({
                colDark: utils.vec3Blend(params.NormalColor, params.DarkColor2, t),
                colNormal: utils.vec3Blend(params.LightColor, params.NormalColor, t),
                colLight: utils.vec3Blend(params.LightColor2, params.LightColor, t)
            });
        }
        else if (tc < 7000) {
            var t = (tc - 4000) / 3000;
            this.instance.setColor({
                colDark: utils.vec3Blend(params.DarkColor2, params.DarkColor2, t),
                colNormal: utils.vec3Blend(params.NormalColor, params.NormalColor, t),
                colLight: utils.vec3Blend(params.LightColor, params.LightColor, t)
            });
        }
        else if (tc < 12000) {
            var t = Math.min(1, (tc - 7000) / 5000);
            this.instance.setColor({
                colDark: utils.vec3Blend(params.DarkColor2, params.DarkColor, t),
                colNormal: utils.vec3Blend(params.NormalColor, params.DarkColor2, t),
                colLight: utils.vec3Blend(params.LightColor, params.NormalColor, t)
            });
        }
        else if (tc < 17000) {
            var t = Math.min(1, (tc - 12000) / 5000);
            this.instance.setColor({
                colDark: utils.vec3Blend(params.DarkColor, params.DarkColor, t),
                colNormal: utils.vec3Blend(params.DarkColor2, params.DarkColor, t),
                colLight: utils.vec3Blend(params.NormalColor, params.DarkColor2, t)
            });
        }
        else {
            var t = Math.min(1, (tc - 17000) / 6000);
            this.instance.setColor({
                colDark: utils.vec3Blend(params.DarkColor, params.GreyColor, t),
                colNormal: utils.vec3Blend(params.DarkColor, params.GreyColor, t),
                colLight: utils.vec3Blend(params.DarkColor2, params.DarkColor, t)
            });
        }
    };
    FlameAnimation.prototype.updateState = function (deltaTime) {
        var cTime = this.currentTime + deltaTime;
        if (this.currentState == FlameAnimation.STATE_BEFORE_START) {
            if (cTime > FlameAnimation.BEFORE_INTERVAL) {
                cTime -= FlameAnimation.BEFORE_INTERVAL;
                this.currentState = FlameAnimation.STATE_SPAWN;
            }
        }
        else if (this.currentState == FlameAnimation.STATE_SPAWN) {
            if (cTime > FlameAnimation.SPAWN_INTERVAL) {
                cTime -= FlameAnimation.SPAWN_INTERVAL;
                this.posX = -1;
                this.currentState = FlameAnimation.STATE_SPAWN_DOWN;
            }
        }
        else if (this.currentState == FlameAnimation.STATE_SPAWN_DOWN) {
            if (cTime > FlameAnimation.SPAWN_DOWN_INTERVAL) {
                cTime -= FlameAnimation.SPAWN_DOWN_INTERVAL;
                this.currentState = FlameAnimation.STATE_FLOATING;
            }
        }
        else if (this.currentState == FlameAnimation.STATE_FLOATING) {
            if (cTime > FlameAnimation.FLOATING_INTERVAL) {
                this.randFlyX += Math.random() * 0.2;
                this.randFlyZ += Math.random() * 0.2;
                cTime -= FlameAnimation.FLOATING_INTERVAL;
                this.posX = -1;
                this.currentState = FlameAnimation.STATE_IDLE;
            }
        }
        else if (this.currentState == FlameAnimation.STATE_IDLE) {
            if (cTime > FlameAnimation.IDLE_INTERVAL) {
                this.isObjDie = true;
            }
        }
        this.currentTime = cTime;
    };
    FlameAnimation.prototype.update = function (deltaTime) {
        if (this.isObjDie)
            return;
        var mesh = this.instance.getMesh();
        var timeScale = controller.getParams().TimeScale;
        this.updateState(deltaTime * timeScale);
        this.timeCount += deltaTime * timeScale;
        if (this.currentState == FlameAnimation.STATE_SPAWN) {
            var t = this.currentTime / FlameAnimation.SPAWN_INTERVAL;
            var t2 = this.currentTime / (FlameAnimation.SPAWN_INTERVAL + FlameAnimation.SPAWN_DOWN_INTERVAL);
            mesh.position.set(this.distX * t2, mesh.position.y + t * 0.4 * this.yRatio * timeScale, this.distZ * t2);
            var scale = t;
            mesh.scale.set(scale, scale, scale);
        }
        else if (this.currentState == FlameAnimation.STATE_SPAWN_DOWN) {
            var t2 = (this.currentTime + FlameAnimation.SPAWN_INTERVAL) /
                (FlameAnimation.SPAWN_INTERVAL + FlameAnimation.SPAWN_DOWN_INTERVAL);
            mesh.position.set(this.distX * t2, mesh.position.y +
                (0.6 * timeScale *
                    (1 - this.currentTime / FlameAnimation.SPAWN_DOWN_INTERVAL) +
                    0.2 * timeScale) * this.yRatio, this.distZ * t2);
        }
        else if (this.currentState == FlameAnimation.STATE_FLOATING) {
            if (this.posX == -1) {
                this.posX = mesh.position.x;
                this.posY = mesh.position.y;
                this.posZ = mesh.position.z;
                this.instance.setFlowRatio(0.5);
            }
            mesh.position.set(mesh.position.x + this.randFlyX * timeScale, mesh.position.y + 0.2 * timeScale, mesh.position.z + this.randFlyZ * timeScale);
            var scale = mesh.scale.x + 0.003 * timeScale;
            mesh.scale.set(scale, scale, scale);
        }
        else if (this.currentState == FlameAnimation.STATE_IDLE) {
            if (this.posX == -1) {
                this.posX = mesh.position.x;
                this.posY = mesh.position.y;
                this.posZ = mesh.position.z;
                this.instance.setFlowRatio(0.2);
            }
            mesh.position.setY(this.posY + this.currentTime / 100);
            if (this.currentTime > FlameAnimation.IDLE_INTERVAL - 5000) {
                this.instance.setOpacity(1 - (this.currentTime - (FlameAnimation.IDLE_INTERVAL - 5000)) / 5000);
            }
            var scale = mesh.scale.x + 0.002 * timeScale;
            mesh.scale.set(scale, scale, scale);
        }
        this.setColor();
        this.instance.update(deltaTime * timeScale * this.animationTimeRatio);
    };
    FlameAnimation.prototype.isDie = function () {
        return this.isObjDie;
    };
    FlameAnimation.prototype.inPolling = function () {
        return this.isInPooling;
    };
    FlameAnimation.prototype.setInPolling = function (val) {
        this.isInPooling = val;
    };
    FlameAnimation.STATE_BEFORE_START = 0;
    FlameAnimation.STATE_SPAWN = 1;
    FlameAnimation.STATE_SPAWN_DOWN = 2;
    FlameAnimation.STATE_FLOATING = 3;
    FlameAnimation.STATE_IDLE = 4;
    FlameAnimation.BEFORE_INTERVAL = 300;
    FlameAnimation.SPAWN_INTERVAL = 400;
    FlameAnimation.SPAWN_DOWN_INTERVAL = 2000;
    FlameAnimation.FLOATING_INTERVAL = 8000;
    FlameAnimation.IDLE_INTERVAL = 20000;
    return FlameAnimation;
}());

export { FlameAnimation };
