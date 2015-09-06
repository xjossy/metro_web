/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.property = new function() {
    // this class stores a value, which can be automatically animated
    // kernel is customizator for value handling
    // kernel functions:
    /*
        applyValue : function(value), // make the World corresponding to value
        middleValue : function(progress, val1, val2) // return middle value when progress is in [0,1]
        duration : function(fromVal, toVal), //return duration of animation
    */
    this.Animator = function(setter, interpolator) {
        this.val = null;
        this.setter = setter;
        this.interpolator = interpolator;
        
        this.setValue = function(newval) { 
            this.val = newval;
            this.setter.applyValue(this.val);
        };
        
        this.animateValue = function(targetVal, startTime, forcedDuration) {
            if( this.val === null ) {
                this.setValue(targetVal);
                return;
            }
			
			if( JSON.stringify(this.targetVal) === JSON.stringify(targetVal)) return;
            
            this.startVal = this.val;
            this.targetVal = targetVal;
            
            this.duration = forcedDuration === undefined ? 
				this.interpolator.duration(this.startVal, this.targetVal) : forcedDuration;
            if( this.duration === 0 ) {
                this.setValue(targetVal);
                return;
            }
            
            this.startTime = startTime;
            this.targetTime = startTime + this.duration;
            this.nextTime = 0;
            
            metro.animator.add(this);
        };
        
        this.tick = function(time) {
            if(time>=this.targetTime) {
                metro.animator.remove(this);
                this.setValue(this.targetVal);
                return;
            }
            
            if(time<this.nextTime) 
                return;
            
            var progress = (time-this.startTime)/this.duration;
            this.setValue(this.interpolator.middleValue(progress, this.startVal, this.targetVal));
            
            if(this.interpolator.nextProgress) {
                this.nextTime = this.interpolator.nextProgress(progress, this.startVal, this.targetVal)
                        * this.duration + this.startTime;
            }
        };
    };
    
    this.FloatFixedInterpolator = function(dur) {
        this.middleValue = function(progress, val1, val2) { 
            return val1 * (1-progress) + val2 * progress;
        };
        this.duration = function(fromVal, toVal) { 
            return dur;
        };
    };
    
    this.FloatInterpolator = function(velo) {
        this.middleValue = function(progress, val1, val2) { 
            return val1 * (1-progress) + val2 * progress;
        };
        this.duration = function(fromVal, toVal) { 
            return Math.abs(toVal-fromVal)*velo;
        };
    };
    
    this.StyleSetter = function(node, attr) {
        this.applyValue = function(value) { 
            node.style[attr] = value;
        };
    };
    
    this.ColorInterpolator = function(duration) {
        this.middleValue = function(p, val1, val2) { 
            var p1 = 1-p;
            var res = [];
            for(var i in val1) 
                res.push(i<3 ? Math.round(val1[i]*p1 + val2[i]*p) : val1[i]*p1 + val2[i]*p);
            
            return res;
        };
        this.duration = function(fromVal, toVal) { 
            if(fromVal===toVal) return 0;
            return duration;
        };
    };
    
    this.ColorSetter = function(setter) {
        this.applyValue = function(val) { 
            setter.applyValue(
                    val.length > 3
                    ? "rgba(" + val[0] + "," + val[1] + "," + val[2] + "," + val[3] + ")"
                    :  "rgb(" + val[0] + "," + val[1] + "," + val[2] + ")"
            );
        };
    };
    
    this.ConstInterpolator = function() {
        this.middleValue = function(progress, val1, val2) { 
            return val2;
        };
        this.duration = function(fromVal, toVal) { 
            return 0;
        };
    };
    
    this.TextSetter = function(object, proportion, position, bgRect) {
        this.applyValue = function(value) { 
            object.childNodes[0].textContent = value;
            var pos = metro.getLabelPosition(proportion, object, position);
            object.setAttribute('x', pos[0]);
            object.setAttribute('y', pos[1]);
            
            if(bgRect) {
                var bbox = metro.safeBBox(object);
                var r = object.getAttribute('rx') || 0;
                r=1;
                bgRect.setAttribute("x", bbox.x - r);
                bgRect.setAttribute("y", bbox.y + r);
                bgRect.setAttribute("width", bbox.width + 2*r);
                bgRect.setAttribute("height", Math.max(0,bbox.height - r));
            }
        };
    };
    
    this.TextInterpolator = function(duration) {
        this.middleValue = function(progress, fromVal, toVal) { 
            var commonPart = this.commonPart(fromVal, toVal);
            var sumLength = this.sumLength(fromVal, toVal);
            
            var pos = Math.round(sumLength*progress);
            if( pos<=fromVal.length-commonPart ) return fromVal.substr(0,fromVal.length-pos);
            return toVal.substr(0,pos-fromVal.length+commonPart);
        };
        this.nextProgress = function(progress, fromVal, toVal) {
            var sumLength = this.sumLength(fromVal, toVal);
            var pos = Math.round(sumLength*progress);
            return (pos+1) / sumLength;
        };
        this.commonPart = function(fromVal, toVal) {
            var minLength = Math.min(fromVal.length, toVal.length);
            if( fromVal.substr(0,minLength) === toVal.substr(0,minLength) ) {
                return minLength;
            }
            return 0;
        };
        this.sumLength = function(fromVal, toVal) {
            return fromVal.length + toVal.length - 2*this.commonPart(fromVal, toVal);
        };
        this.duration = function(fromVal, toVal) { 
            return duration * this.sumLength(fromVal, toVal);
        };
    };
    
    this.AttrSetter = function(object, attr) {
        this.applyValue = function(value) { 
            if(!(attr instanceof Array)) {
                object.setAttribute(attr, value);
                return;
            }
            for(var i in attr) {
                object.setAttribute(attr[i], value[i]);
            }
        };
    };
    
    //value is pair [opacity, text]
    this.OpacityTextInterpolator = function(duration) {
        this.middleValue = function(progress, fromVal, toVal) { 
			if(fromVal[1]===toVal[1]) 
				return [fromVal[0]*progress + toVal[0]*(1-progress), toVal[1]];
            var midProgress = fromVal[0] / (fromVal[0] + toVal[0]);
            if( progress < midProgress ) 
                return [fromVal[0] * (midProgress-progress)/midProgress, fromVal[1]];
            return [toVal[0] * (progress-midProgress)/(1-midProgress), toVal[1]];
        };
        this.duration = function(fromVal, toVal) { 
			if(fromVal[1]===toVal[1]) 
				return duration * Math.abs(fromVal[0]-toVal[0]);
            return duration * (fromVal[0]+toVal[0]) / 2;
        };
    };
    
    this.OpacityTextSetter = function(div) {
        this.applyValue = function(value) { 
            div.style.opacity = value[0];
            div.textContent = value[1];
        };
    }
};