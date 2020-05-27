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
	minZoom: 13,
	maxZoom: 18,
	ext: 'png'
})
.addTo(map);

// ensure map loads properly
window.onload = function() {
    map.invalidateSize()
}

/////////////
/// ICONS ///
/////////////

// icon size
function getIconSize() {
    const mapStyles = window.getComputedStyle(document.getElementById('map'));
    const mapWidth = parseFloat(mapStyles.getPropertyValue('width'));
    const mapHeight = parseFloat(mapStyles.getPropertyValue('height'));
    const vmin = Math.min(mapWidth, mapHeight)
    const currentZoom = map.getZoom();
    return 0.03*vmin + 1.2*currentZoom;
};

// initialize icons
const svgTemplate = L.Util.template(' \
<svg version="1.1" class="leaflet-data-marker" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 15.847 15.847" style="enable-background:new 0 0 15.847 15.847;" xml:space="preserve"> \
    <path d="M15.847,5.228V4.052h-0.065V2.931h-0.064V2.534H15.26V2.93c0,0-11.083,0.078-13.018,0 \
        c-0.296,0-1.986,0.167-0.291,2.773c0,0,0.77,1.168-0.285,2.471c-1.041,1.284-1.51,3.885-1.632,4.671H0v0.468h4.803v-0.468v-0.43 \
        c-2.075,0.382,1.434-4.447,1.278-3.634c0.113,0.029,0.23,0.047,0.352,0.047h1.25c0.772,0,1.797-0.826,1.797-1.599 \
        c0-0.335-0.118-0.642-0.314-0.883h6.185l0.2-0.736h0.262V5.254H15.77l0.011-0.026H15.847z M7.685,8.144h-1.25 \
        c-0.092,0-0.181-0.015-0.265-0.04c0.073-0.429,0.129-0.813,0.169-1.112c0.105,0.347,0.31,0.71,0.713,0.867 \
        C7.08,7.87,7.109,7.875,7.138,7.875c0.094,0,0.184-0.058,0.221-0.15c0.047-0.123-0.014-0.26-0.136-0.308 \
        c-0.417-0.162-0.5-0.792-0.516-1.068h1.205c0.393,0.102,0.686,0.459,0.686,0.883C8.598,7.734,8.188,8.144,7.685,8.144z \
        M14.098,5.612H7.924l1.072-0.357h5.102C14.098,5.255,14.098,5.612,14.098,5.612z"/> \
</svg>');
const icon = L.divIcon({
      className: "leaflet-data-marker",
      html: svgTemplate
})

// adjust icon sizes
function resizeIcons() {
    // adjust size of existing icons
    const size = getIconSize();
    const sizeCSS = String(size) + 'px';
    document.querySelectorAll('#map svg:not(.leaflet-zoom-animated)').forEach(function(svg) {
        svg.style.width = sizeCSS;
        svg.style.height = sizeCSS;
    })
    // change size of icon object
    icon.options.iconSize = [size, size];
}
map.on('zoomstart', resizeIcons)
   .on('resize', resizeIcons)

/////////////////////////////////////
/// READ IN DATA AND INITIAL PLOT ///
/////////////////////////////////////

// load data from most recent year (incidentDataCurrent.csv)
function loadInitialData(response) {
    return new Promise(function(resolve) {
        response.arrayBuffer().then(function(buffer) {
            // get data as string
            const blob = new Blob([buffer], {type : "application/zip"});
            const zip = new JSZip();
            zip.loadAsync(blob).then(function(zip) {
                return zip.file('incidentDataCurrent.csv').async('string');
            // parse and return data
            }).then(function(dataAsString) {
                initialData = d3.csvParse(dataAsString); 
                resolve(initialData);
            })
        })
    })
}

// plot data returned by loadInitialData
const markers = L.layerGroup();
function plotInitialData(initialData) {
    return new Promise(function(resolve) {
        for (i = 0; i < initialData.length; i++) {
            L.marker([initialData[i].LAT, initialData[i].LONG], {icon: icon})
                .on("click", onClick)
                .addTo(markers)
        }
        markers.addTo(map);
        resizeIcons();
        // pass initialData to prepareData
        resolve(initialData);
    })   
}

// prepare data
// two global data objects: dataYearly and dataChron
// dataYearly for yearly data (data keyed by year in descending order)
// dataChron for custom date ranges (data in descending chronological order)

// initialize dataYearly
let dataYearly = {};
let yearDataYearly = 2011;
const yearCurrent = document.querySelector('#date-val option[selected="selected"]').value;
while (yearDataYearly <= yearCurrent) {
    dataYearly[yearDataYearly] = [];
    yearDataYearly++
}    

// iniatialize year, global variable used to keep track of year selected
let year = Number(yearCurrent);

function prepareData(intialData) {
    // add initial data to dataChron and dataYearly
    dataChron = initialData;
    for (i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        // remove year from dataChron
        delete d.YEAR;
        // add incident to dataYearly (year currently set to most recent year)
        dataYearly[year].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
    }

    // load rest of data into dataYearly and dataChron
    fetch('data/incidentDataPrevious.zip').then(function(response) {
        // get data as string
        response.arrayBuffer().then(function(buffer) {
            var blob = new Blob([buffer], {type : "application/zip"});
            var zip = new JSZip();
            zip.loadAsync(blob).then(function(zip) {
                return incidentData = zip.file('incidentDataPrevious.csv').async('string');
            })
        // parse data
        .then(function(dataAsString) {
            return d3.csvParse(dataAsString);
        // add data to dataYearly and dataChron
        }).then(function(data) {            
            data.forEach(function(d) {
                // dataYearly
                dataYearly[d.YEAR].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
                // dataChron
                delete d.YEAR;
                dataChron.push(d);
                })
            })
        })
    })
}

fetch('data/incidentDataCurrent.zip')
.then(loadInitialData)
.then(plotInitialData)
.then(prepareData)

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
        $( '#container-date' ).append(
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
        $( '#container-date' ).css({
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
        $( '#container-date' ).append('<select id="date-val"></select>');
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
        $( '#container-date' ).css({
            'padding-bottom' : l+'vmin'
        });
        markers.clearLayers();
        plotYearly();
    }
    adjustHeight();
    // adjustIframePosition only defined for large screens, will error out on mobile otherwise
    if ($( window ).width() > 800) {
        adjustIframePosition();
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
            L.marker([dataYearly[year][i].LAT,dataYearly[year][i].LONG],{icon: icon})
            .on("click", onClick)
            .addTo(markers)};
        markers.addTo(map);
    }
};

// plot markers when year selected changes 
function changeYear() {
    markers.clearLayers();
    plotYearly();
    resizeIcons();
}

$( '#date-val' ).selectmenu({
    change: changeYear
});

// plot markers for custom date range
function plotCustomDate() {
    markers.clearLayers();
    const fromDateRange = adjustTimeZone(new Date($('#date-val-from').val()));
    const toDateRange = adjustTimeZone(new Date($('#date-val-to').val()));
    var flag = 0;
    // loop through data
    for (i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        d.DATE = adjustTimeZone(new Date(d.DATE));
        if (d.DATE >= fromDateRange && d.DATE <= toDateRange) {
            L.marker([d.LAT, d.LONG],{icon: icon})
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

function unselectMarker() {
    const markerSelectedOld = document.querySelector('.marker-selected');
    if (markerSelectedOld) {
        markerSelectedOld.classList.remove('marker-selected');
    }
}

// handler for when marker is clicked
function onClick(e) {
    // clicking marker already selected pulls up default report
    const markerSelectedOld = document.querySelector('.marker-selected');
    const markerSelectedNew = e.target._icon;
    if (markerSelectedOld == markerSelectedNew) {
        defaultSidePanel();
    // unselected marker clicked
    } else {
        // record series selected before report displayed
        var seriesValChange = $( 'iframe' ).contents().find('series').val();
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
                    // stop displaying default report
                    $('#side-panel-default').css('display', 'none');
                    // display report
                    $('#side-panel').append(dataYearly[year][i].HTML)
                    // unselect previously selected marker
                    unselectMarker();
                    // select marker clicked on
                    markerSelectedNew.classList.add('marker-selected');
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
                    // stop displaying default report
                    $('#side-panel-default').css('display', 'none');
                    // display report
                    $('#side-panel').append(d.HTML)
                    // unselect previously selected marker
                    unselectMarker();
                    // select marker clicked on
                    markerSelectedNew.classList.add('marker-selected');
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

//////////////////////////////////////////
/// SWITCH BETWEEN REPORT AND DEFAULT ////
//////////////////////////////////////////

// switching between police report and default html
// txt variable assigned in barChart()
var flagMarkerSelected = false;
function defaultSidePanel() {
    //markerSelected.clearLayers();
    if (flagMarkerSelected) {
        $('#side-panel-default').css('display', 'unset');
        $('.incident').remove()
        adjustIframePosition();
        changeYearClickChart();
        flagMarkerSelected = false;
        $( '.marker-selected' ).removeClass('marker-selected')
    }
};
map.on('click', defaultSidePanel);

///////////////////////////////////////////////
/// ADJUST HEIGHT OF MAP AND REPORT SECTION ///
///////////////////////////////////////////////

// height of map and shootings report fills to bottom of page
function adjustHeight() {
    if ($( window ).outerWidth(true) <= 800) {  
        $( '#map' ).css('height', '45vh');
        $( '#side-panel' ).css('height', $( window ).height() - $( '#top' ).height() - $( '#map' ).height());
    } else {
        $( '#map' ).height($( window ).height() - $( '#top' ).height());
        $( '#side-panel' ).height($( window ).height() - $( '#top' ).height() 
            - parseInt($( '#side-panel' ).css('padding-bottom'))
        );
    }
};
$(adjustHeight);
$( window ).resize(adjustHeight);

//////////////////
/// BAR CHART ////
//////////////////

vh = function(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
}

function adjustIframePosition() {
    $( 'iframe' ).css('transform', 
        'translate(0,'+ (($( window ).height() - $( '#top' ).height() - vh(50))/2 - 2*$( '#side-panel p' ).outerHeight()) + 'px)');
};
$(adjustIframePosition);

function toggleBarChart() {
    // remove iframe if window <= 800px
    if ($( window ).width() <= 800) {
        $('iframe').css('display', 'none');
    // insert iframe if window > 800px and default side panel being displayed
    } else if (!flagMarkerSelected) {
        $( 'iframe' ).css('display', 'unset');
    }
}

window.onresize = function() {
    adjustIframePosition();
    toggleBarChart();
}

changeYearClickChart = function() {
    $( 'iframe' ).on('load', function () {
        changeYearListener();
        // listener for when seriesSelected changes
        $('iframe').contents().find('ul').on('click', function () {
            changeYearListener();
        })
    })
};

// barChart also contains css formatting for date selectmenus
function barChart() {
    var dateType = $( '#date-type' ).val();
    // bar chart removed if window width <= 800px
    if ($( window ).width() <= 800) {
        if (dateType != 'custom') {
            $( '#container-date' ).css({
                'padding-bottom': '1.5vmin'
            })
        } else {
            $( '#date-range').css({
                'padding-top': '1.5vmin',
                'padding-bottom': '1.5vmin',
                'border-top': '1.5vmin solid gray'
            })
        }
    // bar chart displayed if window width > 800px
    } else if ($( '#side-panel iframe').length == 0) {
        if (dateType != 'custom') {
            $( '#container-date' ).css({
                'padding-bottom': '.85vmin'
            })
        } else {
            $( '#date-range').css({
                'padding-top': '0.85vmin',
                'padding-bottom': '0.85vmin',
                'border-top': '0.85vmin solid gray'
            })
        }
        // change year by clicking on chart
        // setTimeouts used to fix load issues with IE
        window.changeYearListener = function() {
            const rectsNum = $( 'iframe' ).contents().find('#rects-bar-chart-black rect').length;
            this.console.log(rectsNum)
            rectsNUM = yearCurrent-2010;
            if (rectsNum == rectsNUM) {
                $( 'iframe' ).contents().find('rect').on('click', function() {
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

        changeYearClickChart();
    }
}
barChart();