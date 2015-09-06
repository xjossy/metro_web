/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

window.$requestAnimationFrame$ = function(){
    return (
        window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ callback){
            window.setTimeout(callback, 1000 / 60);
        }
    );
}();

metro.animator = new function() {
    var self = this;
    var id = 0;
    self.animationLives = false;
    self.objects = new Object();
    
    self.add = function(obj) {
        if(!('$anim$id' in obj)) {
            obj.$anim$id = id++;
        }
        if(!(obj.$anim$id in self.objects)) {
            self.objects[obj.$anim$id] = obj;
        }
        self.startAnim();
    };
    
    self.startAnim = function() {
        if(self.animationLives) return;
        self.animationLives = true;
        
        window.$requestAnimationFrame$(self.tick);
    };
    
    self.remove = function(obj) {
        delete self.objects[obj.$anim$id];
    };
    
    self.getTime = function () {
        var d = new Date();
        return d.getTime();
    };
    
    self.tick = function() {
        var iters = 0;
        var time = self.getTime();
        
        for(var key in self.objects) {
            self.objects[key].tick(time);
            iters++;
        }
        if( iters!==0 ) {
            window.$requestAnimationFrame$(self.tick);
        } else {
            self.animationLives = false;
        }
    };
};