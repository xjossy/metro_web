/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.db = new function () {
    var metrodb = this;
    
	metro.info = {};
    metrodb.events = [];
    metrodb.added  = {};
    
    metrodb.load = function() {
        for(var x in metro.objectTypes)
            metrodb.objects[x] = {};
        
        var spreadsheetID = "1z8cuBxsQ0qDtbW1zuDSemDmgd6HulLEGysKTWorq-2c";
 
        // Make sure it is public or set to Anyone with link can view 
        var url = "https://spreadsheets.google.com/feeds/list/" + spreadsheetID + "/od6/public/values?alt=json";

        $.getJSON(url, function(data) {
            var entry = data.feed.entry;
            metrodb.minDate = new metro.Date(0,0,0, true);

            $(entry).each(function(){
                var item  = this.gsx$item.$t ? JSON.parse(this.gsx$item.$t) : null;
                var scope = this.gsx$scope.$t;
                var param = this.gsx$param.$t;

                var date  = metro.parseDate(this.gsx$date.$t);
                var val   = this.gsx$val.$t ? JSON.parse(this.gsx$val.$t) : null;
                var old   = this.gsx$old.$t ? JSON.parse(this.gsx$old.$t) : null;
                
                var addedKey = JSON.stringify([date, item, scope,param]);
                if( addedKey in metrodb.added ) return;
                metrodb.added[addedKey] = true;
                
                if( val===null && old===null ) return;
                
                if( date.index()!==0 && (date.index() < metrodb.minDate.index() || metrodb.minDate.index()===0) ) {
                    metrodb.minDate = date;
                }

                /*metrodb.getObject(item, scope).addEvent(
                    old, val, date
                );*/
                
                var event = {
                    //'object' : metrodb.getObject(item, scope), 
                    'item'   : item,
                    'scope'  : scope,
                    'date'   : date,
                    'param'  : param, 
                    'val'    : val, 
                    'old'    : old,
                    'getObject' : function() {return metrodb.getObject(this.item, this.scope);}
                };
                metrodb.events.push(event);
                event.getObject();
            });
         
            metrodb.events.sort(function(x,y){
                return x.date.index() - y.date.index();
            });
            
            metrodb.createNavBg();
            
            metrodb.maxDate = metrodb.events[metrodb.events.length-1].date;
            //metrodb.gotoDate(1);
            //metrodb.gotoDate(metrodb.maxDate.index()-1);
            
            var affected = metrodb.gotoDate(1);
            for(var i in affected) {
                affected[i].apply();
            }
			
			for(var st in metro.db.objects['station']) {
				var station = metro.db.objects['station'][st];
				metro.info.minx = 'minx' in metro.info ? Math.min(station.values.params.x, metro.info.minx) : station.values.params.x;
				metro.info.miny = 'miny' in metro.info ? Math.min(station.values.params.y, metro.info.miny) : station.values.params.y;
				metro.info.maxx = 'maxx' in metro.info ? Math.max(station.values.params.x, metro.info.maxx) : station.values.params.x;
				metro.info.maxy = 'maxy' in metro.info ? Math.max(station.values.params.y, metro.info.maxy) : station.values.params.y;
			}
        
            metrodb.onloaded();
        });
    };
    
    metrodb.objects = {};
    
    //creates or returns already created object
    metrodb.getObject = function(key, type) {
        var skey = JSON.stringify(key);
        
        if(!(skey in metrodb.objects[type])) {
            var obj = metro.objectTypes[type].create(key);
            metrodb.objects[type][skey] = obj;
        }
        
        return metrodb.objects[type][skey];
    };
    
    //returns [begin, end] where begin is index of first event with date >= dateIdx
    // end if index of first event with date > dateIdx
    metrodb.getDateEventIndex = function(dateIdx) {
        var start=0;
        var i;
        
        //no foreach loop, i value should be length at end
        for(i=0;i<metrodb.events.length;++i) {
            var idx = metrodb.events[i].date.index();
            if(idx < dateIdx) start = i+1;
            if(idx > dateIdx) break;
        }
        return [start,i];
    };
    
    //returnes array of affected objects
    metrodb.appplyDiff = function(startDateIdx, endDateIdx) {
        var res = [];
        
        var step = startDateIdx <= endDateIdx ? 1 : -1;
        
        var rangel = metrodb.getDateEventIndex(startDateIdx);
        var ranger = metrodb.getDateEventIndex(endDateIdx);
        
        var start, end;
        
        if(step>0) {
            start = rangel[0]; end = ranger[0];
        } else {
            start = rangel[0]-1; end = ranger[0]-1;
        }
        
        for(var i = start; i!==end; i+=step) {
            var event = metrodb.events[i];
            //var key = JSON.stringify([event.key, event.scope, event.param]);
            //res[key] = [event,event[step > 0 ? 'val' : 'old']];
            var obj = metrodb.getObject(event.item, event.scope);
            obj.values[event.param]
                = event[step > 0 ? 'val' : 'old'];
            if(res.indexOf(obj) < 0) res.push(obj);
        }
        
        return res;
    };
    
    metrodb.gotoDate = function(newDateIdx) {
        res = metrodb.appplyDiff(metrodb.currentDate,newDateIdx);
        metrodb.currentDate = newDateIdx;
		metrodb.currentDateObj = metro.Date.fromIndex(newDateIdx);
        return res;
    };
    
    metrodb.createNavBg = function() {
        var lineSum = {};
        for(var x in metrodb.events) {
            var e = metrodb.events[x];
            if(e.scope!=='station' || e.param!=='status' || e.val !== 'opened') continue;
            
            if(!(e.item[1] in lineSum) ) lineSum[e.item[1]] = [0,0];
            lineSum[e.item[1]][0] ++;
            lineSum[e.item[1]][1] += metro.Date.monthDiff(metrodb.minDate, e.date);
        }
        
        for(var i in lineSum) {
            var line = lineSum[i];
            var mid = metrodb.minDate.addMonths(Math.round(line[1]/line[0]));
        }
    };
    
    metrodb.currentDate = -1;
    
    metrodb.onloaded = function() {};
};