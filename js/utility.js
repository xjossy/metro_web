/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

metro.Date = function(day, month, year, exact) {
    var self = this;
    
    self.day = day;
    self.month = month;
    self.year = year;
    self.exact = exact;
    
    self.index = function() {
        return self.year*10000 + self.month*100 + self.day;
    };
    
    self.numericMonth = function() {
        return self.month<10 ? '0' + self.month : '' + self.month;
    };
    
    self.textMonth = function() {
        return metro.Date.months[self.month];
    };
    
    self.addMonths = function(months) {
        var yearAdd=0;
        
        if( months<0 ) {
            yearAdd = ((-months/12) >> 0)+1;
            months += yearAdd*12;
        }
        
        var year  = self.year  + ((months/12) >> 0);
        var month = self.month + (months%12);
        
        if(month>12) {
            year += 1;
            month -= 12;
        }
        
        return new metro.Date(self.day, month, year-yearAdd, self.exact);
    };
};

metro.Date.months = [
    'Нулеарь',
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь'
];

metro.Date.fromIndex = function(index) {
    var year  = (index/10000)>>0;
    var month = ((index/100)>>0) % 100;
    var day   = index % 100;
    return new metro.Date(day, month, year, true);
}

metro.Date.monthDiff = function(date1, date2) {
    var years = date2.year - date1.year;
    return years*12 - date1.month + date2.month;
};

metro.removeSelection = function() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if (document.selection) {  // IE?
        document.selection.empty();
    }
};

/*metro.labelWidth = function(text) {
    metro.testdiv.innerText = text;
    return metro.testdiv.clientWidth + 1;
};*/

metro.safeBBox = function(elem) {
    var displays = [];
    for(var e = elem; e && e.style; e=e.parentNode) {
        displays.push(e.style.display);
        if(e.style.display=='none') e.style.display = '';
    }
    
    var res = elem.getBBox();
    
    for(var e = elem, i=0; e && e.style; e=e.parentNode, i++) {
        e.style.display = displays[i];
    }
    
    return res;
}

metro.labelWidth = function(text, font) {
    // re-use canvas object for better performance
    var canvas = metro.labelWidth.canvas || (metro.labelWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    if( font!==null ) context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
};

metro.getLabelProportion = function(x,y,textElem, pos) {
    //var textWidth = metro.labelWidth(text, null);
    var textWidth = metro.safeBBox(textElem).width;// textElem.getBBox().width;
    var res = (pos[0] - x) / textWidth;
    res = Math.max(0, Math.min(1,res));
    
    var offset = [res * textWidth + x - pos[0], y - pos[1]];
    
    return {'r' : res, 'off' : offset};
};

metro.getLabelPosition = function(proportion,textElem,pos) {
    //var textWidth = metro.labelWidth(text, null);
    var textWidth = metro.safeBBox(textElem).width;//textElem.getBBox().width;
    return [pos[0] - proportion.r * textWidth + proportion.off[0],pos[1] + proportion.off[1]];
};

metro.parseDate = function(date) {
    date = date.trim();
    
    var exact = true;
    if(date[date.length-1] === '?') {
        exact = false;
        date = date.substring(0,date.length-1).trim();
    }
    
    if(date==='') return new metro.Date(0,0,0,exact);
    
    var months = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря"
    ];
    
    var parts = date.split(" ");
    var day   = parseInt(parts[0]);
    var month = months.indexOf(parts[1])+1;
    var year  = parseInt(parts[2]);
    
    return new metro.Date(day,month,year,exact);
};