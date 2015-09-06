/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.objects = new function() {
    var self = this;
    var svgNS = "http://www.w3.org/2000/svg";
    
    var makeObject = function(obj, key) {
        obj.key = key;
        obj.values = {};
        obj.apply = function() {
            var state = obj.getState();
            for(var i in state) {
                var val = state[i];
                if( val[0] === undefined ) continue;
                val[0].setValue(val[1]);
            }
        };
        obj.animate = function(time) {
            var state = obj.getState();
            for(var i in state) {
                var val = state[i];
                if( val[0] === undefined ) continue;
                val[0].animateValue(val[1], time);
            }
        };
    };
    
    self.load = function() {
        metro.station = new function() {
            var self = this;
            var stationGroup = metro.svg.getElementById("stations");
            var labelGroup = metro.svg.getElementById("labels");
            self.prototype = function(key) {
                var self = this;

                makeObject(self, key);
                
                self.connections = [];
                self.transfers   = [];
                self.transfersColorHandler = [];

                self.g           = document.createElementNS(svgNS,'g');
                self.bigCircle   = document.createElementNS(svgNS,'circle');
                self.smallCircle = document.createElementNS(svgNS,'circle');
                self.g.appendChild(self.bigCircle);
                self.g.appendChild(self.smallCircle);
                stationGroup.appendChild(self.g);
                
                self.labelG = document.createElementNS(svgNS,'g');
                self.labelBackgroud = document.createElementNS(svgNS,'rect');
                self.labelText = document.createElementNS(svgNS,'text');
                self.labelText.appendChild(document.createTextNode(''));
                self.labelG.appendChild(self.labelBackgroud);
                self.labelG.appendChild(self.labelText);
                labelGroup.appendChild(self.labelG);
                
                self.bigCircle.setAttribute('tag', JSON.stringify(key));
                
                self.bigCircle.setAttribute('fill', '#000000');
                self.bigCircle.setAttribute('r', metro.consts.bigr + 'px');
                self.smallCircle.setAttribute('fill','#ffffff');
                self.smallCircle.setAttribute('r',metro.consts.smallr + 'px');
                self.labelBackgroud.setAttribute('rx','3px');
                self.labelBackgroud.setAttribute('class','station-bg');
                self.labelText.setAttribute('class','station-label');
                
                self.visibilityHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.g, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
        
                self.openHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.smallCircle, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
        
                self.smallPosHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.smallCircle,['cx','cy']),
                    new metro.property.ConstInterpolator()
                );
        
                self.bigPosHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.bigCircle,['cx','cy']),
                    new metro.property.ConstInterpolator()
                );
        
                self.colorHandler = new metro.property.Animator(
                    new metro.property.ColorSetter(
                        new metro.property.AttrSetter(self.bigCircle,'fill')
                    ),
                    new metro.property.ColorInterpolator(metro.consts.duration)
                );
        
                self.labelVisibilityHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.labelG, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
        
                self.labelDisplayHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.labelG, 'display'),
                    new metro.property.ConstInterpolator()
                );
        
                self.labelProportion = null;
        
                self.values['status'] = 'hidden';
                self.values['params'] = {x:0, y:0};
                self.values['line'] = 0;
                
                self.getPos = function() {
                    var p = self.values.params;
                    return [p.x,p.y];
                };
        
                self.getState = function() {
                    var p = self.values.params;
                    
                    var status = self.values['status'];
                    var visible = status==="opened" || status==="closed";
                    var opened  = status==="opened" || status==="hidden";
                    var pos = self.getPos();
                    
                    if(self.labelProportion === null && 'labeltext' in p) {
                        self.labelText.childNodes[0].textContent = p.labeltext;
                        self.labelProportion = metro.getLabelProportion(p.labelx, p.labely, self.labelText, pos);
                        
                        self.labelTextHandler = new metro.property.Animator(
                            new metro.property.TextSetter(self.labelText,self.labelProportion, pos, self.labelBackgroud),
                            new metro.property.TextInterpolator(metro.consts.duration/30)
                        );
                        //self.labelTextHandler.setParams(self.labelProportion, pos);
                    }
                    
                    var labelOpacity = visible ? 1 : 0;
                    var labelDisplay = self.hasLabelConcurrency() ? 'none' : '';
                    
                    var color = metro.getLineColor(self.values.line);
                    var res = [
                        [self.visibilityHandler, visible ? 1 : 0],
                        [self.openHandler, opened ? 1 : 0],
                        [self.smallPosHandler, pos],
                        [self.bigPosHandler, pos],
                        [self.colorHandler, color],
                        [self.labelVisibilityHandler, labelOpacity],
                        [self.labelDisplayHandler, labelDisplay],
                        [self.labelTextHandler, self.values.name]
                    ];
                    
                    for(var i in self.connections) {
                        if(self.connections[i].st0!==self) continue;
                        res.push(
                            [self.connections[i].colorHandler, color]
                        );
                    }
                    
                    for(var i in self.transfers) {
                        var t = self.transfers[i];
                        res.push(
                            [t.wayVisibilityHandler, t.wayVisible()]
                        );
                        res.push(
                            [t.visibilityHandler, t.visible()]
                        );
                    }
                    
                    for(var i in self.transfersColorHandler) {
                        res.push(
                            [self.transfersColorHandler[i], color]
                        );
                    }
                    
                    return res;
                };
                
                //true if other station displays same label
                self.hasLabelConcurrency = function() {
                    for(var i in self.transfers) {
                        var other = self.transfers[i].st0;
                        if(other!==self && other.values.name === self.values.name
                                && other.values.status!=='hidden' )
                            return true;
                    }
                    return false;
                };
            };
            self.create = function(key) {
                return new self.prototype(key);
            };
        };
        
        metro.transfer = new function() {
            var self = this;
            var svgGroup = metro.svg.getElementById("transfers");
            var gradIds = 0;
            self.prototype = function(key) {
                var self = this;
                
                self.id = 'transf' + (gradIds++);

                makeObject(self, key);
                
                self.st0 = metro.db.getObject(key[0], 'station');
                self.st1 = metro.db.getObject(key[1], 'station');
                
                self.st0.transfers.push(self);
                self.st1.transfers.push(self);
                
                self.gradient = document.createElementNS(svgNS,'linearGradient');
                self.gradient.setAttribute('id', self.id);
                self.gradient.setAttribute('gradientUnits','userSpaceOnUse');
                /*self.gradient.setAttribute('x1','0%');
                self.gradient.setAttribute('y1','0%');
                self.gradient.setAttribute('x2','100%');
                self.gradient.setAttribute('y2','100%');*/
                self.stop1 = document.createElementNS(svgNS,'stop');
                self.stop2 = document.createElementNS(svgNS,'stop');
                self.stop1.setAttribute('offset','0%');
                self.stop2.setAttribute('offset','100%');
                self.gradient.appendChild(self.stop1);
                self.gradient.appendChild(self.stop2);
                metro.svgDefs.appendChild(self.gradient);
                
                self.g    = document.createElementNS(svgNS,'g');
                self.grad = document.createElementNS(svgNS,'path');
                self.way  = document.createElementNS(svgNS,'path');
                self.g.appendChild(self.grad);
                self.g.appendChild(self.way);
                svgGroup.appendChild(self.g);
                
                self.grad.style.strokeWidth = metro.consts.transwidth + 'px';
                self.grad.style.stroke = "url(#"+ self.id +")";;
                
                self.way.style.strokeWidth = '1.6px';
                self.way.style.stroke = '#ffffff';
                
                self.visibilityHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.g, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
                
                self.wayVisibilityHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.way, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
        
                self.wayPositionHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.way, 'd'),
                    new metro.property.ConstInterpolator()
                );
        
                self.gradPositionHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.grad, 'd'),
                    new metro.property.ConstInterpolator()
                );
        
                self.gradientPosHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.gradient,['x1','y1', 'x2', 'y2']),
                    new metro.property.ConstInterpolator()
                );
        
                self.st0.transfersColorHandler.push(
                    new metro.property.Animator(
                        new metro.property.ColorSetter(new metro.property.StyleSetter(self.stop1, 'stop-color')),
                        new metro.property.ColorInterpolator(metro.consts.duration)
                    )
                );
        
                self.st1.transfersColorHandler.push(
                    new metro.property.Animator(
                        new metro.property.ColorSetter(new metro.property.StyleSetter(self.stop2, 'stop-color')),
                        new metro.property.ColorInterpolator(metro.consts.duration)
                    )
                );
                
                self.visible = function() {
                    return self.values.status ==='shown' && self.st0.values.status!=='hidden'
                               && self.st1.values.status!=='hidden';
                };
                
                self.wayVisible = function() {
                    return self.values.status ==='shown' && self.st0.values.status==='opened'
                               && self.st1.values.status==='opened';
                };

                self.getState = function() { 
                    var p0 = self.st0.getPos();
                    var p1 = self.st1.getPos();
                    var wayd = "M " + p0[0] + ',' + p0[1] + ' ' + p1[0] + ',' + p1[1];
                    
                    var dx = p1[0]-p0[0], dy=p1[1]-p0[1];
                    var dist = Math.sqrt(dx*dx+dy*dy);
                    var offset = Math.sqrt(metro.consts.bigr*metro.consts.bigr - 
                            metro.consts.transwidth*metro.consts.transwidth/4);
                    
                    var to = offset / dist;
                    var ta = 1-to;
                    
                    var pg0 = [p0[0]*ta + p1[0]*to,p0[1]*ta + p1[1]*to];
                    var pg1 = [p0[0]*to + p1[0]*ta,p0[1]*to + p1[1]*ta];
                    var gradd = "M " + pg0[0] + ',' + pg0[1] + ' ' + pg1[0] + ',' + pg1[1];
                    
                    return [
                        [self.visibilityHandler, self.visible() ? 1 : 0],
                        [self.wayVisibilityHandler, self.wayVisible() ? 1 : 0],
                        [self.wayPositionHandler, wayd],
                        [self.gradPositionHandler, gradd],
                        [self.gradientPosHandler, [pg0[0],pg0[1],pg1[0],pg1[1]]]
                    ];
                };
            };
            self.create = function(key) {
                return new self.prototype(key);
            };
        };
        
        metro.connection = new function() {
            var self = this;
            var svgGroup = metro.svg.getElementById("connections");
            self.prototype = function(key) {
                var self = this;

                makeObject(self, key);
                
                self.st0 = metro.db.getObject(key[0], 'station');
                self.st1 = metro.db.getObject(key[1], 'station');
                
                self.st0.connections.push(self);
                self.st1.connections.push(self);
                
                self.path = document.createElementNS(svgNS,'path');
                //self.path.style.strokeWidth = "3";
                //self.path.style.fill = "none";
                self.path.setAttribute('class','connection');
                svgGroup.appendChild(self.path);
                
                self.positionHandler = new metro.property.Animator(
                    new metro.property.AttrSetter(self.path, 'd'),
                    new metro.property.ConstInterpolator()
                );
        
                self.opacityHandler = new metro.property.Animator(
                    new metro.property.StyleSetter(self.path, 'opacity'),
                    new metro.property.FloatInterpolator(metro.consts.duration)
                );
        
                self.colorHandler = new metro.property.Animator(
                    new metro.property.ColorSetter(new metro.property.StyleSetter(self.path, 'stroke')),
                    new metro.property.ColorInterpolator(metro.consts.duration)
                );
        
                self.values.params = {
                    "p1x" : 0,
                    "p1y" : 0,
                    "p2x" : 0,
                    "p2y" : 0,
                    "h1x" : 0,
                    "h1y" : 0,
                    "h2x" : 0,
                    "h2y" : 0
                };

                self.getState = function() { 
                    var p = self.values.params;
                    return [
                        [self.positionHandler, 
                             "m "+p.p1x+","+p.p1y+
                            " c "+(p.h1x-p.p1x)+","+(p.h1y-p.p1y)+
                              " "+(p.h2x-p.p1x)+","+(p.h2y-p.p1y)+
                              " "+(p.p2x-p.p1x)+","+(p.p2y-p.p1y) ],
                        [self.opacityHandler, self.values.status === 'shown' ? 1 : 0]
                    ]; 
                };
            };
            self.create = function(key) {
                return new self.prototype(key);
            };
        };

        metro.objectTypes = {
            "station"  : metro.station    ,
            "conn"     : metro.connection ,
            "trans"    : metro.transfer
        };
    };
};