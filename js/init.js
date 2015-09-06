/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var metro = {};

metro.consts = {
    duration : 1000,
    playspeed : 300,
    font: 'font-size:8px;font-family:Tahoma',
    bigr : 4,
    smallr: 2,
    transwidth: 4
};

metro.init = function() {
	metro.infoBar.init();
    metro.svg = document.getElementById('scheme');
    metro.svgDefs = metro.svg.getElementsByTagName('defs')[0];
    //metro.testdiv = document.getElementById('testdiv');
    metro.objects.load();
    metro.canvas.init();
    
    metro.db.onloaded = metro.controls.init;
    metro.db.load();
};

metro.lineColors = [
    0x000000,
    0xcd0506,
    0x0a6f20,
    0x072889,
    0x069cd3,
    0x7f0000,
    0xff7f00,
    0x92007b,
    0xfcc628,
    0xa2a5b4,
    0x8cce3a,
    0x29b1a6,
    0xb2dae7
];

metro.colorToHex = function(color) {
    return '#' + (color + 0x1000000).toString(16).substr(1);
};

metro.getLineColor = function(line) {
    var color = metro.lineColors[line];
    return [
        color >> 16,
        (color >> 8) % 0x100,
        color % 0x100
    ];
};

metro.infoBar = new function() {
	var self = this;
	self.shown = false;
	self.init = function() {
		var infoBtn = document.getElementById('btnInfo');
		var info = document.getElementById('infoBox');
		
		var infoBtnClass = infoBtn.className;
		var infoClass = info.className;
		
		infoBtn.addEventListener('click', function() {
			self.show(!self.shown);
		}, false);
		
		self.show = function(shown) {
			infoBtn.className = shown ? infoBtnClass + ' active' : infoBtnClass;
			info.className    = shown ? infoClass + ' active' : infoClass;
			self.shown = shown;
		};
	};
};

window.onload = metro.init;