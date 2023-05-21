"use strict";


import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

var Controller = (function () {
    function Controller() {
    }
    Controller.init = function () {
        this.eventListener = [];
        var ControlParam = function () {
            this.LightColor2 = '#ff8700';
            this.LightColor = '#f7f342';
            this.NormalColor = '#f7a90e';
            this.DarkColor2 = '#ff9800';
            this.GreyColor = '#3c342f';
            this.DarkColor = "#181818";
            this.TimeScale = 3;
            this.ParticleSpread = 1;
            this.ParticleColor = '#ffb400';
            this.InvertedBackground = false;
            this.ShowGrid = true;
            this.restart = function () { };
        };
        var params = new ControlParam();
        var gui = new GUI();
        var f1 = gui.addFolder('Spawn Color');
        this.eventListener[Controller.DARK_COLOR] = f1.addColor(params, 'DarkColor');
        this.eventListener[Controller.DARK_COLOR_2] = f1.addColor(params, 'GreyColor');
        this.eventListener[Controller.DARK_COLOR_2] = f1.addColor(params, 'DarkColor2');
        this.eventListener[Controller.NORMAL_COLOR] = f1.addColor(params, 'NormalColor');
        this.eventListener[Controller.LIGHT_COLOR] = f1.addColor(params, 'LightColor');
        this.eventListener[Controller.LIGHT_COLOR_2] = f1.addColor(params, 'LightColor2');
        f1.open();
        var f2 = gui.addFolder('Flare Particle');
        this.eventListener[Controller.PARTICLE_SPREAD] = f2.add(params, 'ParticleSpread', 0, 2);
        this.eventListener[Controller.PARTICLE_COLOR] = f2.addColor(params, 'ParticleColor');
        f2.open();
        this.eventListener[Controller.INVERTED_BACKGROUND] = gui.add(params, 'InvertedBackground');
        this.eventListener[Controller.SHOW_GRID] = gui.add(params, 'ShowGrid');
        this.eventListener[Controller.TIME_SCALE] = gui.add(params, 'TimeScale', 0, 10);
        gui.add(params, 'restart');
        this.gui = gui;
        this.params = params;
    };
    Controller.getParams = function () {
        return this.params;
    };
    Controller.setRestartFunc = function (func) {
        this.params.restart = func;
    };
    Controller.attachEvent = function (key, callback) {
        this.eventListener[key].onChange(callback);
    };
    Controller.DARK_COLOR = 0;
    Controller.NORMAL_COLOR = 1;
    Controller.LIGHT_COLOR = 2;
    Controller.LIGHT_COLOR_2 = 3;
    Controller.DARK_COLOR_2 = 4;
    Controller.RESTART = 5;
    Controller.TIME_SCALE = 6;
    Controller.PARTICLE_SPREAD = 7;
    Controller.PARTICLE_COLOR = 8;
    Controller.INVERTED_BACKGROUND = 9;
    Controller.SHOW_GRID = 10;
    return Controller;
}());

export { Controller };
