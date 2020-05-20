///////////
/// MAP ///
///////////

// map parameters
const center = L.latLng(39.7461, -75.5498);
const zoom = 14;
 
// base map
const map = L.map('map')
    .setView(center, zoom)
    .setMaxBounds(L.latLngBounds([[39.8261, -75.4698], [39.6661, -75.6298]]) 
);

// tiles
L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>\n\
                 <div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>',
	subdomains: 'abcd',
	minZoom: 13,
	maxZoom: 18,
	ext: 'png'
})
.addTo(map);

// iniatialize layers
var markers = L.layerGroup();
var markerSelected = L.layerGroup();

// ensure map loads properly
$( window ).on('load', function () {
    map.invalidateSize()});

/////////////
/// ICONS ///
/////////////

// icon size
function getIconSize() {
    var vmin;
    var currentZoom = map.getZoom();
    var mapHeight = $( '#map' ).height();
    var mapWidth = $( '#map' ).width();
    mapHeight > mapWidth ? vmin = mapWidth : vmin = mapHeight;
    return 0.03*vmin + 1.2*(currentZoom);
};

// initialize icons
function initializeIcons() {
    var size = getIconSize();
    gunIcon = L.icon({
            iconUrl: 'gunIcon.png',
            iconSize: [size,size]
        });
    gunIconSelected = L.icon({
            iconUrl: 'gunIconSelected.png',
            iconSize: [size,size]
        });
};

// adjust icon sizes
function resizeIcons() {
    var size = getIconSize();
    $( '.leaflet-marker-icon' ).css({
        'width': size,
        'height': size
        })
};
map.on ('resize', resizeIcons);
map.on('zoomend', resizeIcons);
$( '#map' ).on('click', resizeIcons);

/////////////////
/// LOAD DATA ///
/////////////////

// two global data objects
// dataYearly for yearly data
// dataChron for custom date ranges

// initialize objects to put data into, populate select options
var dataChron, yearCurrent, year;
var dataYearly = {};
var yearAll = 2011;
d3.csv('../data/yearlyData.csv').then(function(data) {
    yearCurrent = data[0].year;
    while (yearAll <= yearCurrent) {
        dataYearly[yearAll] = [];
        yearAll++
    };    
    // iniatialize year, global var used to keep track of year selected
    year = Number(yearCurrent);
})

// initial load and plot for current year data
fetch('../data/shootingsDataCurrent.zip').then(function (response) {
    response.arrayBuffer().then(function (buffer) {
        var blob = new Blob([buffer], {type : "application/zip"});
        var zip = new JSZip();
        zip.loadAsync(blob)
        .then(function (zip) {
            return zip.file('shootingsDataCurrent.csv').async('string');
    })
    .then(function(dataAsString) {
        return d3.csvParse(dataAsString);
    }).then( function(data) {
        // write into dataChron
        dataChron = data;
        initializeIcons();
        for (i = 0; i < dataChron.length; i++) {
            let d = dataChron[i];
            // write into dataYearly
            dataYearly[yearCurrent].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
            // plot
            L.marker([d.LAT, d.LONG],{icon: gunIcon})
            .on("click", onClick)
            .addTo(markers)};
        markers.addTo(map);
        })
    })
}).then(function () {
    // load rest of data into dataChron and dataYearly objects
    fetch('../data/shootingsDataPrevious.zip').then(function (response) {
        response.arrayBuffer().then(function (buffer) {
            var blob = new Blob([buffer], {type : "application/zip"});
            var zip = new JSZip();
            zip.loadAsync(blob)
            .then(function (zip) {
                return shootingsData = zip.file('shootingsDataPrevious.csv').async('string');
            })
        .then(function (dataAsString) {
            return d3.csvParse(dataAsString);
        }).then(function (data) {            
            data.forEach( function(d) {
                // write into dataChron
                dataChron.push(d);
                //write into dataYearly
                dataYearly[d.YEAR].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
                })
            })
        })
    })
})

// remove year property from dataChron
$( window ).on('load', function () {
    for (i=0; i<dataChron.length; i++) {
       delete dataChron[i].YEAR;
    }
})

/////////////////
/// DATE TYPE ///
/////////////////

// date picker for custom date range
function adjustTimeZone (d) {
    return new Date(d.getTime() + d.getTimezoneOffset()*60000)
}

function initializeDatePicker(from, to) {
    sharedAttributes = {
        changeMonth: true,
        changeYear: true,
        minDate: adjustTimeZone(new Date('2011-01-01')),
        maxDate: adjustTimeZone(new Date()),
        showAnim: 'slideDown',
    }
    $( '#date-val-from' ).datepicker(sharedAttributes);
    $( '#date-val-to' ).datepicker(sharedAttributes);
    $( '#date-val-from' ).datepicker('setDate', adjustTimeZone(from));
    $( '#date-val-to' ).datepicker('setDate', adjustTimeZone(to));
};

// handler for when date-type selectmenu changes
function changeDateType (){
    var dateType = $( '#date-type' ).val();
    // l used for css
    if ($(window).width() > 800) {
        l = '0.85'
    } else {
        l = '1.5'
    }
    // switch from year to custom
    if (dateType == 'custom') {
        year = $( '#date-val' ).val();
        // remove year selectmenu
        $( '#date-val' ).remove();
        // add custom date ribbon
        $( '#date-container' ).append(
            '<div id="date-range">' +   
            '<input type="text" id="date-val-from" class="custom-date"/>'+
            '<span>&nbsp;-&nbsp;</span>' + 
            '<input type="text" id="date-val-to" class="custom-date"/>' +
            '</div>'
        );
        $( '#date-range' ).css({
            'padding-top' : l+'vmin',
            'padding-bottom' : l+'vmin',
            'background-color' : 'lightgray',
            'border-top' : l+'vmin solid gray'
        });
        $( '#date-container' ).css({
            'padding-bottom' : '0'
        });

        fromDate = new Date(year+'-01-01');
        toDate = new Date(year+'-12-31');
        initializeDatePicker(fromDate, toDate);
        $( '.custom-date' ).change(plotCustomDate);
    }
    // switch from custom to year
    else {
        year = Number($( '#date-val-from' ).val().substring(6));
        // remove custom date ribbon
        $( '#date-range' ).remove();
        // add year selectmenu
        $( '#date-container' ).append('<select id="date-val"></select>');
        var yearAll = 2011;
        while (yearAll <= yearCurrent) {
            if (yearAll == year) {
                $('#date-val').append('<option value="'+yearAll+'" selected = "selected">'+yearAll+'</option>');
            } else {
                $('#date-val').append('<option value="'+yearAll+'">'+yearAll+'</option>');
            }
            yearAll++
        };
        $( '#date-val' ).selectmenu({
            change: changeYear
        })
        $( '.ui-icon' ).remove();
        $( '#date-container' ).css({
            'padding-bottom' : l+'vmin'
        });
        markers.clearLayers();
        markerSelected.clearLayers();
        plotYearly();
    }
    adjustHeight();
    // adjustIframe only defined for large screens, will error out on mobile otherwise
    if ($( window ).width() > 800) {
        adjustIframe();
    }
    resizeIcons();
}

$( '#date-type' ).selectmenu({
    change: changeDateType
  });
 
// format selectmenus
$(function () {
    $( '.ui-icon' ).remove();
    $( '#map' ).css('z-index', '0');
});

///////////////
/// MARKERS ///
///////////////

// plot markers for year selected
function plotYearly() {
    year = Number($( '#date-val' ).val());
    if (year) {
        for (i = 0; i < dataYearly[year].length; i++) {
            L.marker([dataYearly[year][i].LAT,dataYearly[year][i].LONG],{icon: gunIcon})
            .on("click", onClick)
            .addTo(markers)};
        markers.addTo(map);
    }
};

// plot markers when year selected changes 
function changeYear() {
    markers.clearLayers();
    markerSelected.clearLayers();
    plotYearly();
    resizeIcons();
}

$( '#date-val' ).selectmenu({
    change: changeYear
});

// plot markers for custom date range
function plotCustomDate() {
    markers.clearLayers();
    markerSelected.clearLayers();
    const fromDateRange = adjustTimeZone(new Date($('#date-val-from').val()));
    const toDateRange = adjustTimeZone(new Date($('#date-val-to').val()));
    var flag = 0;
    // loop through data
    for (i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        d.DATE = adjustTimeZone(new Date(d.DATE));
        if (d.DATE >= fromDateRange && d.DATE <= toDateRange) {
            L.marker([d.LAT, d.LONG],{icon: gunIcon})
            .on("click", onClick)
            .addTo(markers)
            // first incident in date range found
            if (flag == 0) {
                flag++
            }
        // first incident before (chronologically) date range found
        } else if (flag == 1) {
            break;
        }
    }
    markers.addTo(map);
    resizeIcons();
};

// initialize seriesVal, used in barChart.html
var seriesVal = 0;

// handler for when marker is clicked
function onClick() {
    // clicking marker already selected pulls up default report
    if (Object.keys(markerSelected._layers)[0] == this._leaflet_id) {
        defaultReport();
    // unselected marker clicked
    } else {
        // record series selected before police report displayed
        var seriesValChange = $( 'iframe' ).contents().find('#seriesSelect').val();
        // seriesValChange is false if click on another shooting after previously clicking on shooting
        if (seriesValChange) {
            seriesVal = seriesValChange;
        }
        const lat = this._latlng.lat;
        const long = this._latlng.lng;
        var dateType = $( '#date-type' ).val();
        // year selected (no custom date range)
        // loop through data for year selected only
        if (dateType != 'custom') {  
            for (i = 0; i < dataYearly[year].length; i++) {
                if (dataYearly[year][i].LAT == lat && dataYearly[year][i].LONG == long) {
                    // populate report with html corresponding to icon clicked
                    $( '#report' ).html(dataYearly[year][i].HTML);
                    // change color of marker clicked on to black
                    markerSelected.clearLayers();
                    L.marker([dataYearly[year][i].LAT,dataYearly[year][i].LONG],{icon: gunIconSelected})
                        .on("click",onClick)
                        .addTo(markerSelected);
                    markerSelected.addTo(map);
                    break;
                };
            };    
        // custom date range
        // loop through data backwards chronologically
        } else {
            const fromDateRange = adjustTimeZone(new Date($('#date-val-from').val()));
            const toDateRange = adjustTimeZone(new Date($('#date-val-to').val()));
            var flag = 0;
            for (i = 0; i < dataChron.length; i++) {
                let d = dataChron[i];
                d.DATE = adjustTimeZone(new Date(d.DATE));
                if (d.LAT == lat && d.LONG == long && d.DATE >= fromDateRange && d.DATE <= toDateRange) {
                    $( '#report' ).html(d.HTML);
                    markerSelected.clearLayers();
                    L.marker([d.LAT,d.LONG],{icon: gunIconSelected})
                        .on("click",onClick)
                        .addTo(markerSelected);
                    markerSelected.addTo(map);
                    if (flag == 0) {
                        flag++
                    }
                } else if (flag == 1) {
                    break;
                }
            }
        }
        flagMarkerSelected = true;
    }
};

/////////////////////////////////////////////////
/// SWITCH BETWEEN POLICE REPORT AND DEFAULT ////
/////////////////////////////////////////////////

// switching between police report and default html
// txt variable assigned in barChart()
var flagMarkerSelected = false;
function defaultReport() {
    markerSelected.clearLayers();
    if (flagMarkerSelected) {
        const seriesValReport = seriesVal;
        $( '#report' ).html(txt);
        adjustIframe();
        changeYearClickChart();
        flagMarkerSelected = false;
        $( 'iframe' ).on('load', function () {
            $( 'iframe' ).contents().find('#seriesSelect').remove().val(seriesValReport);
        });
    }
};
map.on('click', defaultReport);

///////////////////////////////////////////////
/// ADJUST HEIGHT OF MAP AND REPORT SECTION ///
///////////////////////////////////////////////

// height of map and shootings report fills to bottom of page
function adjustHeight() {
    if ($( window ).outerWidth(true) <= 800) {  
        $( '#map' ).css('height', '45vh');
        $( '#report' ).css('height', $( window ).height() - $( '#top' ).height() - $( '#map' ).height());
    } else {
        $( '#map' ).height($( window ).height() - $( '#top' ).height());
        $( '#report' ).height($( window ).height() - $( '#top' ).height() 
            - parseInt($( '#report' ).css('padding-bottom'))
        );
    }
};
$(adjustHeight);
$( window ).resize(adjustHeight);

//////////////////
/// BAR CHART ////
//////////////////

// barChart also contains css formatting for date selectmenus
txt = $( '#report' ).html();
iframeHTML = "<iframe src='barChart.html' id='chart'></iframe>";
txtNoIframe = txt.replace(iframeHTML, '');
function barChart() {
    var dateType = $( '#date-type' ).val();
    // bar chart removed if window width <= 800px
    if ($( window ).width() <= 800) {
        if (dateType != 'custom') {
            $( '#date-container' ).css({
                'padding-bottom': '1.5vmin'
            })
        } else {
            $( '#date-range').css({
                'padding-top': '1.5vmin',
                'padding-bottom': '1.5vmin',
                'border-top': '1.5vmin solid gray'
            })
        }
        $( '#report iframe' ).remove();
        txt = txtNoIframe;
    // bar chart displayed if window width > 800px
    } else if ($( '#report iframe').length == 0) {
        if (dateType != 'custom') {
            $( '#date-container' ).css({
                'padding-bottom': '.85vmin'
            })
        } else {
            $( '#date-range').css({
                'padding-top': '0.85vmin',
                'padding-bottom': '0.85vmin',
                'border-top': '0.85vmin solid gray'
            })
        }
        //insert iframe
        if ($( '#report p' ).length == 3) {
            $( '#report' ).append(iframeHTML)
        }
        txt = txtNoIframe + iframeHTML;
        // change year by clicking on chart
        // setTimeouts used to fix load issues with IE
        window.changeYearListener = function() {
            const rectsNum = $( 'iframe' ).contents().find('rect.remove.black').length;
            rectsNUM = yearCurrent-2010;
            if (rectsNum == rectsNUM) {
                $( 'iframe' ).contents().find('rect.remove').on('click', function() {
                    // window.yearClicked from passYearParent in barChart.js
                    setTimeout( function () {
                        // custom date range
                        if (!($('#date-val').val())) {
                            fromDate = '01/01/'+window.yearClicked;
                            if (window.yearClicked == yearCurrent) {
                                today = new Date();
                                toDate = today.getMonth()+'/'+today.getDate()+'/'+yearCurrent
                            } else {
                                toDate = '12/31/'+window.yearClicked;
                            }
                            $( '#date-val-from' ).val(fromDate);
                            $( '#date-val-to' ).val(toDate);
                            plotCustomDate();
                        } else {
                        // year
                            $('#date-val').val(window.yearClicked);
                            $('#date-val').selectmenu('refresh');
                            changeYear();
                        }
                    }, 50);
                })
            } else {
                setTimeout(changeYearListener,100);
            }
        };

        window.changeYearClickChart = function() {
            $( 'iframe' ).on('load', function () {
                changeYearListener();
                //listener for when seriesSelected changes
                $('iframe').contents().find('ul').on('click', function () {
                    changeYearListener();
                })
            })
        };
        changeYearClickChart();
        
        ///////////////////
        /// ADJUSTMENTS ///
        ///////////////////

        // adjust location of iframe
        window.vh = function(v) {
            var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            return (v * h) / 100;
        }

        window.adjustIframe = function() {
            var iframe = $( 'iframe' );
            iframe.css('transform', 
                'translate(0,'+ (($( window ).height() - $( '#top' ).height() - vh(50))/2 - 2*$( '#report p' ).outerHeight()) + 'px)');
        };
        $(adjustIframe);
        $( window ).resize(adjustIframe);

        // resize bar chart when window size changes
        $( window ).resize( function() {
            $( 'iframe' ).attr('src', 'barChart.html');  
        });
    }
}
barChart();
$( window ).resize(barChart);