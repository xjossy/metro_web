/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.canvas = {};

metro.canvas.set = function(canvas) {
    var self=this;
    
    self.maxFactor = 5;
    self.minFactor = 1/3;

    var getWh = function() {
        var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        
        return {w:w, h:h};
    };
    
    var setSize = function() {
        var wh = getWh();

        canvas.setAttribute('width', wh.w);
        canvas.setAttribute('height', wh.h);
        
        document.body.addEventListener('resize', setSize);
    };

    //document.body.addEventListener('resize', setSize);
    document.body.onresize = setSize;
    
    var overlay = document.createElement('div');
    overlay.setAttribute('class', 'overlay');
    overlay.style.display = 'none';
    var overlayDisplayed = false;
    document.body.appendChild(overlay);

    var lastX=canvas.width/2, lastY=canvas.height/2;
    var dragStart,dragged;

    canvas.addEventListener('mousedown',function(evt){
        document.body.setAttribute('class','no-select');
        lastX = evt.clientX || (evt.pageX - (canvas.offsetLeft || canvas.scrollLeft));
        lastY = evt.clientY || (evt.pageY - (canvas.offsetTop  || canvas.scrollTop ));
        dragStart = transform.transformedPoint(lastX,lastY);
        dragged = false;
    },false);
    
    var mousemove = function(evt){
        lastX = evt.clientX || (evt.pageX - (canvas.offsetLeft || canvas.scrollLeft));
        lastY = evt.clientY || (evt.pageY - (canvas.offsetTop  || canvas.scrollTop ));
        dragged = true;
        if (dragStart) {
            if(!overlayDisplayed ) {
                var wh = getWh();
        
                overlay.style.display = 'inline-block';
                overlay.style.width  = wh.w + 'px';
                overlay.style.height = wh.h + 'px';
                overlayDisplayed = true;
            }

            var pt = transform.transformedPoint(lastX,lastY);
            transform.translate(pt.x-dragStart.x,pt.y-dragStart.y);
            transform.correctTranslate();
        }
    };
    var mouseup = function(evt){
        if (dragStart) {
            overlay.style.display = 'none';
            overlayDisplayed = false;
            document.body.setAttribute('class','');
            //document.body.style.webkitUserSelect = document.body.style.userSelect = '';
            metro.removeSelection();
        }
        dragStart = null;
        //if (!dragged) zoom(evt.shiftKey ? -1 : 1 );
    };
	
	var touches = [NaN, NaN];
	var touchPoses = [];
	
	var touchHandle = function(touchEvent) {
		if( touchEvent.touches.length == 1 ) {
			var touch = touchEvent.touches[0];
			var i = touch.identifier;
			var idx = touches.indexOf(i);
			
			if(idx>=0) {
				transform.translate(
					touch.screenX - touchPoses[idx].x,
					touch.screenY - touchPoses[idx].y 
				);
			}
			
			touches[0] = i;
			touchPoses[0] = {'x':touch.screenX, 'y':touch.screenY};
			
			touches[1] = NaN;
		} else if( touchEvent.touches.length == 2 ) {
			var touch0 = touchEvent.touches[0];
			var i0 = touch0.identifier;
			var idx0 = touches.indexOf(i0);
			
			var touch1 = touchEvent.touches[1];
			var i1 = touch1.identifier;
			var idx1 = touches.indexOf(i1);
			
			if(idx0>=0 && idx1>=0) {
				var oldcx = (touchPoses[idx0].x + touchPoses[idx1].x)/2;
				var oldcy = (touchPoses[idx0].y + touchPoses[idx1].y)/2;
				
				var newcx = (touch0.screenX + touch1.screenX)/2;
				var newcy = (touch0.screenY + touch1.screenY)/2;
				
				var olddx = (touchPoses[idx0].x - touchPoses[idx1].x);
				var olddy = (touchPoses[idx0].y - touchPoses[idx1].y);
				
				var newdx = (touch0.screenX - touch1.screenX);
				var newdy = (touch0.screenY - touch1.screenY);
				
				var oldd = Math.sqrt(olddx*olddx+olddy*olddy);
				var newd = Math.sqrt(newdx*newdx+newdy*newdy);
				
				var oldpt = transform.transformedPoint(oldcx,oldcy);
				var newpt = transform.transformedPoint(newcx,newcy);
				
				transform.translate( newpt.x, newpt.y);
				var factor = newd/oldd;
				transform.scale(factor);
				transform.translate(-oldpt.x,-oldpt.y);
			}
			
			touches[0] = i0;
			touches[1] = i1;
			touchPoses[0] = {'x':touch0.screenX, 'y':touch0.screenY};
			touchPoses[1] = {'x':touch1.screenX, 'y':touch1.screenY};
		} else {
			touches = [NaN,NaN];
			return true;
		}
		
		touchEvent.preventDefault();
		return false;
	};
	
	canvas.addEventListener('touchstart',touchHandle,false);
	canvas.addEventListener('touchmove',touchHandle,false);
	canvas.addEventListener('touchend',touchHandle,false);
	
    canvas.addEventListener('mousemove',mousemove,false);
    canvas.addEventListener('mouseup',mouseup,false);
    overlay.addEventListener('mousemove',mousemove,false);
    overlay.addEventListener('mouseup',mouseup,false);
    overlay.addEventListener('mouseout',mouseup,false);

    var scaleFactor = 1.1;
    var zoom = function(clicks){
        var pt = transform.transformedPoint(lastX,lastY);
        transform.translate(pt.x,pt.y);
        var factor = Math.pow(scaleFactor,clicks);
        factor = Math.min(factor,self.maxFactor/transform.getScale());
        factor = Math.max(factor,self.minFactor/transform.getScale());
        transform.scale(factor);
        transform.translate(-pt.x,-pt.y);
        transform.correctTranslate();
    };

    var handleScroll = function(evt){
        var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
        if (delta) zoom(delta);
        return evt.preventDefault() && false;
    };

    canvas.addEventListener('DOMMouseScroll',handleScroll,false);
    canvas.addEventListener('mousewheel',handleScroll,false);

    var transform = new function(svg){
        var transform = this.transform = svg.createSVGTransform();
        g = svg.getElementsByTagName('g')[0];
        g.transform.baseVal.appendItem(this.transform);
        //var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
        var xform = svg.createSVGMatrix();
        this.getTransform = function(){ return xform; };

        var updateMatrix = function() {
                transform.setMatrix(xform);
                g.transform.baseVal.replaceItem(transform, 0);
        };
        
        this.getScale = function(sx,sy) {
            return Math.sqrt(Math.abs(xform.a*xform.d-xform.b*xform.c));
        }

        this.scale = function(sx){
            xform = xform.scale(sx);
            updateMatrix();
        };

        this.translate = function(dx,dy){
                xform = xform.translate(dx,dy);
                updateMatrix();
        };
        
        this.correctTranslate = function() {
            var rect = svg.getBBox();
            var xbounds = [0, (svg.offsetWidth  || svg.clientWidth ) - rect.width];
            var ybounds = [0, (svg.offsetHeight || svg.clientHeight) - rect.height];
            
            xbounds.sort();
            ybounds.sort();
            
            var pt = this.transformPoint(0,0);
            
            var cx = pt.x;
            var cy = pt.y;
            
            cx = Math.max(xbounds[0]-rect.width /2,Math.min(xbounds[1]+rect.width /2,cx));
            cy = Math.max(ybounds[0]-rect.height/2,Math.min(ybounds[1]+rect.height/2,cy));
            
            var scale = this.getScale();
            
            this.translate((cx - pt.x)/scale, (cy - pt.y)/scale);
        };

        var pt  = svg.createSVGPoint();
        this.transformPoint = function(x,y){
                pt.x=x; pt.y=y;
                return pt.matrixTransform(xform);
        };
        this.transformedPoint = function(x,y){
                pt.x=x; pt.y=y;
                return pt.matrixTransform(xform.inverse());
        };
    }(canvas);

    //var transform = new transform(canvas);
    setSize();
};

metro.canvas.init = function() {
    metro.canvas.set(document.getElementById('scheme'));
};