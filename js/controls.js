/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.controls = new function() {
    var self = this;
    var svgNS = "http://www.w3.org/2000/svg";
    
    self.init = function() {
        self.navdiv = document.getElementById('navbar');
        self.navsvg = document.getElementById('navbarImg');
        self.bottomDiv = document.getElementById('bottomDiv')
        
        self.months = metro.Date.monthDiff(metro.db.minDate, metro.db.maxDate);
        
        self.fillContent();
        self.setupBar();
        
        window.addEventListener('resize', self.setupBar, false);
        
        self.navdiv.onmousedown = function (e) {
            var date = self.getDateByX(e.clientX);
			self.startPlay(false);
            //metro.db.gotoDate(date);
            self.animatedGotoDate(date);
			self.setCursorRect(date);
        };
		
		metro.canvas.center();
		
		self.playOn = true;
		self.playProc();
    };
	
	self.animatedGotoDate = function(date) {
		var affected = metro.db.gotoDate(date.index());
		var time = metro.animator.getTime();
		for(var i in affected) {
			affected[i].animate(time);
		}
	};
	
	self.startPlay = function(start) {
		self.playOn = start;
		
		var time = metro.animator.getTime();
		self.playAnimator.animateValue(start ? 1 : 0.5, time);
		
		if(start) self.playProc();
	}
    
    self.getDateByX = function(x) {
        var pos = (x - self.navdiv.offsetLeft)/(self.navdiv.offsetWidth);
        //var months = metro.Date.monthDiff(metro.db.minDate, metro.db.maxDate);
        var targetMonth = Math.round(self.months*pos);
        var date = metro.db.minDate.addMonths(targetMonth);
        return date;
    }
    
    self.fillContent = function() {
        var mindec = (metro.db.minDate.year / 10) >> 0;
        var maxdec = (metro.db.maxDate.year / 10) >> 0;
        
        self.cursorRect = document.createElementNS(svgNS,'rect');
        self.cursorRect.setAttribute('class', 'nav-cursor');
        self.navsvg.appendChild(self.cursorRect);
        
        self.paths = [];
        self.texts = [];
        
        for(var dec = mindec; dec <= maxdec; ++dec) {
            var path = document.createElementNS(svgNS,'path');
            var text = document.createElementNS(svgNS,'text');
            
            path.setAttribute('class', 'nav-dec-splitter');
            text.setAttribute('class', 'nav-dec-text');
            
            self.navsvg.appendChild(path);
            self.navsvg.appendChild(text);
            
            self.paths.push(path);
            self.texts.push(text);
            
            text.appendChild(document.createTextNode(dec*10));
        }
        
        self.paths[0].setAttribute('class', 'nav-dec-splitter first');
        self.texts[0].style.display = 'none';
        self.texts[self.texts.length - 1].style.display = 'none';
        
        var minyear = metro.db.minDate.year;
        var maxyear = metro.db.maxDate.year;
        
        self.years = {};
        for(var i=minyear;i<=maxyear;++i) {
            self.years[i] = [];
        }
        
        for(var x in metro.db.events) {
            var e = metro.db.events[x];
            
            if(e.date.year===0) continue;
            if(e.scope!=='station' || e.param!=='status' || e.val !== 'opened') continue;
            
            self.years[e.date.year].push(e.item[1]);
        }
        
        self.yearRects = {};
        self.maxStPerYear = 0;
        for(var i=minyear;i<=maxyear;++i) {
            //Array.sort(self.years[i]);
            self.yearRects[i] = [];
            for(var j in self.years[i]) {
                var rect = document.createElementNS(svgNS,'rect');
                rect.setAttribute('class', 'nav-year-box');
                rect.style.fill = metro.colorToHex(metro.lineColors[self.years[i][j]]);
                self.yearRects[i].push(rect);
                
                self.navsvg.appendChild(rect);
            }
            self.maxStPerYear = Math.max(self.yearRects[i].length, self.maxStPerYear);
        }
        
        self.colorController = new metro.property.Animator(
            new metro.property.ColorSetter(new metro.property.StyleSetter(self.bottomDiv, 'background-color')),
            new metro.property.ColorInterpolator(metro.consts.duration)
        );
        
        self.cursorXController = new metro.property.Animator(
            new metro.property.AttrSetter(self.cursorRect, 'x'),
            new metro.property.FloatFixedInterpolator(metro.consts.duration)
        );
        
        self.pointer = new self.Pointer(document.getElementById('pointer'));
        self.pointerOpacityController = new metro.property.Animator(
            new metro.property.StyleSetter(self.pointer.div, 'opacity'),
            new metro.property.FloatInterpolator(metro.consts.duration)
        );
        
        $(self.navsvg).on({
            'mouseenter' : function() {
                self.pointerOpacityController.animateValue(1, (new Date()).getTime());
            },
            'mouseleave' : function() {
                self.pointerOpacityController.animateValue(0, (new Date()).getTime());
            } 
        });
        self.navdiv.addEventListener('mousemove', function(evt) {
            var date = self.getDateByX(evt.clientX);
            self.pointer.setText(date.numericMonth() + '.' + date.year);
            self.pointer.setPos(evt.clientX, self.navdiv.getBoundingClientRect().top);
        }, false);
        
        self.info = document.getElementById('info');
        self.monthDisplay = self.info.getElementsByClassName('header')[0];
		self.infoAnimator = new metro.property.Animator(
			new metro.property.OpacityTextSetter(self.monthDisplay),
			new metro.property.OpacityTextInterpolator(metro.consts.duration)
		);
		
		document.getElementById('playsvg').onclick = function() {
			self.startPlay(!self.playOn);
		};
		
		self.bntPlay = document.getElementById('bntPlay');
		self.playAnimator = new metro.property.Animator(
			new metro.property.StyleSetter(self.bntPlay, 'fill-opacity'),
			new metro.property.FloatInterpolator(metro.consts.duration)
		);
		
		self.startPlay(true);
    };
    
    self.setCursorRect = function(date, forcedDuration) {
        if(!self.cursorRect) return;
        
        var yearColor = self.yearColor(date.year);
        yearColor.push(.5);
        var time = (new Date()).getTime();
        var x0 = self.getDateX(date);
		
		var infoText = self.playOn ? date.year : date.textMonth() + ' ' + date.year;
        
        self.cursorXController.animateValue(x0, time, forcedDuration);
        self.colorController.animateValue(yearColor, time);
		self.infoAnimator.animateValue([1,infoText], time);
        
        //self.monthDisplay.textContent = self.monthDisplay.innerText = date.textMonth() + ' ' + date.year;
        self.info.style.display = 'block';
        //self.cursorRect.setAttribute('x', x0);
    };
    
    self.yearColor = function(year) {
        var minyear = metro.db.minDate.year;
        year = Math.max(year, minyear);
        
        while(self.years[year].length==0) --year;
        var line = self.years[year][0];
        
        return metro.getLineColor(line);
    };
    
    self.getDateX = function(date) {        
        var month = metro.Date.monthDiff(metro.db.minDate, date);
        return Math.max(0,month / self.months * self.navdiv.offsetWidth);
    };
    
    self.setupBar = function() {
        self.navsvg.setAttribute('width', self.navdiv.clientWidth);
        
        var mindec = (metro.db.minDate.year / 10) >> 0;
        var maxdec = (metro.db.maxDate.year / 10) >> 0;
        
        var y0=0, y1 = self.navdiv.clientHeight;
        
        var prevx;
        
        var text = self.texts[0];
        var textSize = 30;
        var sectorWidth = 120 / self.months * self.navdiv.offsetWidth;
        text.style.display='inline';
        do {
            textSize -= 2;
            text.style.fontSize = textSize+'px';
        } while(text.getBBox().width > .8 * sectorWidth);
        
        var textBox = text.getBBox();
        text.style.display='none';
        
        for(var dec = mindec; dec <= maxdec; ++dec) {
            var x = self.getDateX(new metro.Date(1,1,dec*10, true));
            self.paths[dec-mindec].setAttribute('d','M ' + x + ',' + y0 + ' ' + x + ',' + y1);
            
            if( dec-mindec>=2 ) {
                var text = self.texts[dec-mindec-1];
                
                text.setAttribute('x', (prevx+x-textBox.width) / 2);
                text.setAttribute('y', (y1+y0+.7*textBox.height) / 2);
                
                text.style.fontSize = textSize + 'px';
            }
            
            prevx = x;
        }
        
        var prevx;
        var mpy = self.maxStPerYear;
        
        var minyear = metro.db.minDate.year;
        var maxyear = metro.db.maxDate.year;
        
        for(var i=minyear;i<=maxyear+1;++i) {
            var x = self.getDateX(new metro.Date(1,1,i, true));
            
            if(i>minyear) {
                mpy = self.years[i-1].length;
                for(var j in self.years[i-1]) {
                    self.yearRects[i-1][j].setAttribute('x',prevx);
                    self.yearRects[i-1][j].setAttribute('y',((y1+1)*(mpy-j-1)+y0*(j+1))/(mpy));
                    
                    self.yearRects[i-1][j].setAttribute('width',x-prevx-1);
                    self.yearRects[i-1][j].setAttribute('height',(y1+1-y0)/mpy-1);
                }
            }
            
            prevx = x;
        }
        
        self.cursorRect.setAttribute('y', 0);
        self.cursorRect.setAttribute('width', self.navdiv.clientWidth);
        self.cursorRect.setAttribute('height', self.navdiv.clientHeight);
        
        self.setCursorRect(metro.Date.fromIndex(metro.db.currentDate));
    };
    
    self.Pointer = function(div) {
        var self = this;
        
        var text   = div.getElementsByClassName('pointer-message')[0];
        var cursor = div.getElementsByClassName('pointer-cursor')[0];
        var cursorW2 = cursor.getBoundingClientRect().width/2;
        
        self.div = div;
        
        self.setText = function(data) {
            text.textContent = text.innerText = data;
        };
        self.setPos = function(x,y) {
            var screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            
            div.style.top = (y-div.clientHeight)+'px';
            var left = x - div.clientWidth/2;
            left = Math.max(left,0);
            left = Math.min(left,screenWidth + cursorW2 - div.clientWidth);
            
            div.style.left = left + "px";
            cursor.style.left = (x - left - cursorW2) + 'px';
        };
    };
	
	self.playProc = function() {
		if(self.playTimeoutSet) return false;
		
		if(!self.playOn) return;
		
		var curMonth = Math.max(0,metro.Date.monthDiff(metro.db.minDate, metro.db.currentDateObj));
		if( curMonth>= self.months ) {
			self.startPlay(false);
			return;
		}
		var targetDate = metro.db.minDate.addMonths(curMonth + 1);
		
		self.animatedGotoDate(targetDate);
		self.setCursorRect(targetDate, metro.consts.playspeed);
		
		window.setTimeout(function() {
			self.playTimeoutSet = false;
			self.playProc();
		}, metro.consts.playspeed);
		
		self.playTimeoutSet = true;
	};
};